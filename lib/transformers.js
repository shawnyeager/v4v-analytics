/**
 * Data Transformers Module
 * Pure functions for filtering and aggregating transaction data
 * Shared between CLI and dashboard
 */

import { CONFIG } from './config.js';

/**
 * Parse essay slug from description
 * Format: "site.com/essay-slug" or just "site.com" (footer)
 * @param {string} description - Transaction description
 * @param {string} siteUrl - Site URL to match
 * @returns {string|null} Essay slug or null
 */
export function parseEssaySlug(description, siteUrl = CONFIG.siteUrl) {
  if (!description || !siteUrl) return null;

  // Escape dots for regex and extract slug
  const escaped = siteUrl.replace(/\./g, '\\.');
  const regex = new RegExp(`${escaped}\\/([a-z0-9-]+)`);
  const match = description.match(regex);
  return match ? match[1] : null;
}

/**
 * Filter transactions for V4V payments (description contains site URL)
 * @param {Array} transactions - All transactions
 * @param {string} siteUrl - Site URL to filter by
 * @returns {Array} Filtered transactions
 */
export function filterV4VPayments(transactions, siteUrl = CONFIG.siteUrl) {
  if (!siteUrl) return [];
  return transactions.filter(tx =>
    tx.description && tx.description.includes(siteUrl)
  );
}

/**
 * Filter transactions by date range
 * @param {Array} transactions - Transactions to filter
 * @param {Date|null} from - Start date
 * @param {Date|null} to - End date
 * @returns {Array} Filtered transactions
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
 * @param {Array} transactions - Transactions to aggregate
 * @param {string} sortBy - Sort by: 'sats', 'count', or 'recent'
 * @returns {Map} Map of slug -> {sats, count, lastPayment}
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
 * @param {Array} transactions - Transactions to aggregate
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {Map} Map of period key -> {sats, count}
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
 * @param {Array} transactions - Transactions to summarize
 * @param {number|null} btcPrice - BTC price for USD conversion
 * @returns {Object} Summary statistics
 */
export function buildSummary(transactions, btcPrice = null) {
  const satsToUsd = (sats) => btcPrice ? (sats / 100_000_000) * btcPrice : null;

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
      usd: satsToUsd(essaySats),
    },
    general: {
      sats: generalSats,
      payments: generalTxs.length,
      usd: satsToUsd(generalSats),
    },
    totalUsd: satsToUsd(totalSats),
    avgUsd: satsToUsd(avgSats),
    btcPrice,
  };
}

/**
 * Convert raw transaction to simplified format for API/dashboard
 * @param {Object} tx - Raw transaction
 * @returns {Object} Simplified transaction
 */
export function simplifyTransaction(tx) {
  return {
    amount: Math.floor(tx.amount / 1000),
    timestamp: tx.settled_at || tx.created_at,
    description: tx.description,
    essay: parseEssaySlug(tx.description) || '(footer/general)',
  };
}
