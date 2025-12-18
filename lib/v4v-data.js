/**
 * V4V Data Library
 * Shared data fetching and processing for V4V analytics
 */

import { config } from 'dotenv';
import { WebSocket } from 'ws';
import { NWCClient } from '@getalby/sdk';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '..', '.v4v-cache.json');

// Load environment variables from .env if present
config({ path: path.join(__dirname, '..', '.env'), quiet: true });

// Polyfill WebSocket for Node.js
globalThis.WebSocket = WebSocket;

// Site URL for V4V payment filtering (configurable via env)
const SITE_URL = process.env.V4V_SITE_URL || 'shawnyeager.com';

/**
 * Create NWC client
 * @param {Object} options
 * @param {number} options.timeout - Request timeout in ms (default: 120000)
 */
export function createClient(options = {}) {
  const nwcUrl = process.env.NWC_CONNECTION_STRING;
  if (!nwcUrl) {
    throw new Error('NWC_CONNECTION_STRING not found. Set it in your environment or .env file.');
  }
  return new NWCClient({
    nostrWalletConnectUrl: nwcUrl,
    timeout: options.timeout || parseInt(process.env.NWC_TIMEOUT, 10) || 120000,
  });
}

/**
 * Fetch current BTC price in USD from CoinGecko
 */
export async function fetchBtcPrice() {
  return new Promise((resolve) => {
    https.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.bitcoin?.usd || null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Convert sats to USD
 */
export function satsToUsd(sats, btcPrice) {
  if (!btcPrice) return null;
  return (sats / 100_000_000) * btcPrice;
}

/**
 * Format USD amount
 */
export function formatUsd(usd) {
  if (usd === null) return '';
  if (usd < 0.01) return ' (~$0.01)';
  return ` (~$${usd.toFixed(2)})`;
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Load cached transactions
 */
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      return data.transactions || [];
    }
  } catch {
    // Ignore cache errors
  }
  return [];
}

/**
 * Save transactions to cache
 */
function saveCache(transactions) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      updated: new Date().toISOString(),
      transactions,
    }, null, 2));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Get cache file path (for external use)
 */
export function getCacheFile() {
  return CACHE_FILE;
}

/**
 * Clear cache
 */
export function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      return true;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const stats = fs.statSync(CACHE_FILE);
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const transactions = data.transactions || [];

    const timestamps = transactions
      .map(tx => tx.settled_at || tx.created_at)
      .filter(Boolean);

    return {
      file: CACHE_FILE,
      sizeKb: (stats.size / 1024).toFixed(1),
      updated: data.updated,
      totalTransactions: transactions.length,
      oldest: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newest: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch transactions from NWC (recent only, uses cache)
 */
export async function fetchTransactions(client, onProgress = null) {
  const cached = loadCache();
  const latestCached = cached.length > 0
    ? Math.max(...cached.map(tx => tx.settled_at || tx.created_at || 0))
    : 0;

  const newTransactions = [];
  let offset = 0;
  const limit = 10;
  const baseDelay = 300;
  const maxRetries = 2;
  const maxBatches = 20; // Limit to ~200 recent transactions per fetch
  let batchCount = 0;

  while (batchCount < maxBatches) {
    let response;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        response = await client.listTransactions({
          type: 'incoming',
          limit,
          offset,
        });
        break;
      } catch (error) {
        if (error.name === 'Nip47ReplyTimeoutError' || error.code === 'INTERNAL') {
          retries++;
          if (retries >= maxRetries) {
            if (newTransactions.length > 0 || cached.length > 0) {
              console.warn(`Warning: Relay timeout. Using ${newTransactions.length} new + ${cached.length} cached transactions.`);
              break;
            }
            throw new Error('Alby Hub timeout - is your Alby Hub running?');
          }
          await new Promise(r => setTimeout(r, 2000 * retries));
          continue;
        }
        throw error;
      }
    }

    if (!response?.transactions || response.transactions.length === 0) {
      break;
    }

    // Check if we've reached cached data
    const oldestInBatch = Math.min(...response.transactions.map(tx => tx.settled_at || tx.created_at || Infinity));

    for (const tx of response.transactions) {
      const txTime = tx.settled_at || tx.created_at || 0;
      if (txTime > latestCached) {
        newTransactions.push(tx);
      }
    }

    if (onProgress) onProgress(newTransactions.length);

    // Stop if we've reached cached data
    if (oldestInBatch <= latestCached) {
      break;
    }

    if (response.transactions.length < limit) {
      break;
    }

    offset += limit;
    batchCount++;
    await new Promise(r => setTimeout(r, baseDelay));
  }

  // Merge and dedupe by payment_hash
  const seen = new Set();
  const merged = [];
  for (const tx of [...newTransactions, ...cached]) {
    if (!seen.has(tx.payment_hash)) {
      seen.add(tx.payment_hash);
      merged.push(tx);
    }
  }

  // Sort by time descending
  merged.sort((a, b) => (b.settled_at || b.created_at || 0) - (a.settled_at || a.created_at || 0));

  // Save updated cache
  saveCache(merged);

  return merged;
}

/**
 * Filter transactions for V4V payments (description contains site URL)
 */
export function filterV4VPayments(transactions, siteUrl = SITE_URL) {
  return transactions.filter(tx =>
    tx.description && tx.description.includes(siteUrl)
  );
}

/**
 * Parse essay slug from description
 * Format: "site.com/essay-slug" or just "site.com" (footer)
 */
export function parseEssaySlug(description, siteUrl = SITE_URL) {
  if (!description) return null;

  // Escape dots for regex and extract slug
  const escaped = siteUrl.replace(/\./g, '\\.');
  const regex = new RegExp(`${escaped}\\/([a-z0-9-]+)`);
  const match = description.match(regex);
  return match ? match[1] : null;
}

/**
 * Filter transactions by date range
 */
export function filterByDateRange(transactions, from, to) {
  return transactions.filter(tx => {
    const timestamp = tx.settled_at || tx.created_at;
    if (!timestamp) return false;

    const date = new Date(timestamp * 1000);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

/**
 * Aggregate transactions by essay
 */
export function aggregateByEssay(transactions, sortBy = 'sats') {
  const byEssay = new Map();

  for (const tx of transactions) {
    const slug = parseEssaySlug(tx.description) || '(footer/general)';
    const timestamp = tx.settled_at || tx.created_at;
    const existing = byEssay.get(slug) || { sats: 0, count: 0, lastPayment: 0 };
    existing.sats += Math.floor(tx.amount / 1000);
    existing.count += 1;
    if (timestamp > existing.lastPayment) {
      existing.lastPayment = timestamp;
    }
    byEssay.set(slug, existing);
  }

  // Sort based on option
  const sortFn = {
    sats: (a, b) => b[1].sats - a[1].sats,
    count: (a, b) => b[1].count - a[1].count,
    recent: (a, b) => b[1].lastPayment - a[1].lastPayment,
  }[sortBy] || ((a, b) => b[1].sats - a[1].sats);

  return new Map([...byEssay.entries()].sort(sortFn));
}

/**
 * Aggregate transactions by time period
 */
export function aggregateByPeriod(transactions, period = 'monthly') {
  const byPeriod = new Map();

  for (const tx of transactions) {
    const timestamp = tx.settled_at || tx.created_at;
    if (!timestamp) continue;

    const date = new Date(timestamp * 1000);
    let key;

    if (period === 'daily') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      // Get ISO week start (Monday)
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay() + 1);
      key = d.toISOString().split('T')[0];
    } else {
      // Monthly
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const existing = byPeriod.get(key) || { sats: 0, count: 0 };
    existing.sats += Math.floor(tx.amount / 1000);
    existing.count += 1;
    byPeriod.set(key, existing);
  }

  // Sort by date descending
  return new Map([...byPeriod.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

/**
 * Build summary stats from transactions
 */
export function buildSummary(transactions, btcPrice = null) {
  const totalSats = transactions.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);
  const avgSats = transactions.length > 0 ? Math.round(totalSats / transactions.length) : 0;

  // Split by essay vs general
  const essayTxs = transactions.filter(tx => parseEssaySlug(tx.description));
  const generalTxs = transactions.filter(tx => !parseEssaySlug(tx.description));
  const essaySats = essayTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);
  const generalSats = generalTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);

  return {
    totalSats,
    totalPayments: transactions.length,
    avgSats,
    essays: {
      sats: essaySats,
      payments: essayTxs.length,
      usd: btcPrice ? satsToUsd(essaySats, btcPrice) : null,
    },
    general: {
      sats: generalSats,
      payments: generalTxs.length,
      usd: btcPrice ? satsToUsd(generalSats, btcPrice) : null,
    },
    totalUsd: btcPrice ? satsToUsd(totalSats, btcPrice) : null,
    avgUsd: btcPrice ? satsToUsd(avgSats, btcPrice) : null,
    btcPrice,
  };
}

/**
 * Fetch all V4V data in one call
 */
export async function fetchV4VData(options = {}) {
  const client = createClient();

  try {
    // Fetch BTC price if requested
    const btcPrice = options.usd ? await fetchBtcPrice() : null;

    // Fetch and filter transactions
    const allTransactions = await fetchTransactions(client);
    let v4vPayments = filterV4VPayments(allTransactions);

    // Apply date range filter
    if (options.from || options.to) {
      const fromDate = options.from ? new Date(options.from) : null;
      const toDate = options.to ? new Date(options.to + 'T23:59:59') : null;
      v4vPayments = filterByDateRange(v4vPayments, fromDate, toDate);
    }

    return {
      transactions: v4vPayments,
      summary: buildSummary(v4vPayments, btcPrice),
      btcPrice,
    };
  } finally {
    client.close();
  }
}
