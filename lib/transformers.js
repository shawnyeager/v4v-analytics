/**
 * Data Transformers Module
 * Pure functions for filtering and aggregating transaction data
 * Shared between CLI and dashboard
 *
 * @typedef {Object} Transaction
 * @property {number} amount - Amount in millisatoshis
 * @property {number} [settled_at] - Settlement timestamp (Unix seconds)
 * @property {number} [created_at] - Creation timestamp (Unix seconds)
 * @property {string} [description] - Payment description
 * @property {string} payment_hash - Unique payment identifier
 *
 * @typedef {Object} EssaySummary
 * @property {number} sats - Total satoshis received
 * @property {number} count - Number of payments
 * @property {number} lastPayment - Timestamp of last payment
 *
 * @typedef {Object} PeriodSummary
 * @property {number} sats - Total satoshis received
 * @property {number} count - Number of payments
 *
 * @typedef {Object} ReportSummary
 * @property {number} totalSats - Total satoshis received
 * @property {number} totalPayments - Total number of payments
 * @property {number} avgSats - Average satoshis per payment
 * @property {Object} essays - Essay-specific statistics
 * @property {number} essays.sats - Satoshis from essay payments
 * @property {number} essays.payments - Number of essay payments
 * @property {number|null} essays.usd - USD value of essay payments
 * @property {Object} general - General/footer payment statistics
 * @property {number} general.sats - Satoshis from general payments
 * @property {number} general.payments - Number of general payments
 * @property {number|null} general.usd - USD value of general payments
 * @property {number|null} totalUsd - Total USD value
 * @property {number|null} avgUsd - Average USD value
 * @property {number|null} btcPrice - BTC price used for conversion
 */

import { CONFIG } from './config.js';
import { MILLISATS_PER_SAT, FOOTER_SLUG } from './constants.js';

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
 * Check if description is a footer/general payment
 * @param {string} description - Transaction description
 * @param {string} siteUrl - Site URL to match
 * @returns {boolean}
 */
export function isFooterPayment(description, siteUrl = CONFIG.siteUrl) {
  if (!description || !siteUrl) return false;
  return description.trim() === siteUrl || description.trim() === `https://${siteUrl}`;
}

/**
 * Filter transactions for V4V payments (description contains site URL)
 * @param {Transaction[]} transactions - All transactions
 * @param {string} siteUrl - Site URL to filter by
 * @returns {Transaction[]} Filtered transactions
 */
export function filterV4VPayments(transactions, siteUrl = CONFIG.siteUrl) {
  if (!siteUrl) return [];
  return transactions.filter(tx =>
    tx.description && tx.description.includes(siteUrl)
  );
}

/**
 * Filter transactions by date range
 * @param {Transaction[]} transactions - Transactions to filter
 * @param {Date|null} from - Start date
 * @param {Date|null} to - End date
 * @returns {Transaction[]} Filtered transactions
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
 * @param {Transaction[]} transactions - Transactions to aggregate
 * @param {string} sortBy - Sort by: 'sats', 'count', or 'recent'
 * @returns {Map<string, EssaySummary>} Map of slug -> summary
 */
export function aggregateByEssay(transactions, sortBy = 'sats') {
  const byEssay = new Map();

  for (const tx of transactions) {
    const slug = parseEssaySlug(tx.description) || FOOTER_SLUG;
    const timestamp = tx.settled_at || tx.created_at;
    const existing = byEssay.get(slug) || { sats: 0, count: 0, lastPayment: 0 };
    existing.sats += Math.floor(tx.amount / MILLISATS_PER_SAT);
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
 * @param {Transaction[]} transactions - Transactions to aggregate
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {Map<string, PeriodSummary>} Map of period key -> summary
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
    existing.sats += Math.floor(tx.amount / MILLISATS_PER_SAT);
    existing.count += 1;
    byPeriod.set(key, existing);
  }

  // Sort by date descending
  return new Map([...byPeriod.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

/**
 * Build summary stats from transactions
 * @param {Transaction[]} transactions - Transactions to summarize
 * @param {number|null} btcPrice - BTC price for USD conversion
 * @returns {ReportSummary} Summary statistics
 */
export function buildSummary(transactions, btcPrice = null) {
  const satsToUsd = (sats) => btcPrice ? (sats / 100_000_000) * btcPrice : null;

  const totalSats = transactions.reduce((sum, tx) => sum + Math.floor(tx.amount / MILLISATS_PER_SAT), 0);
  const avgSats = transactions.length > 0 ? Math.round(totalSats / transactions.length) : 0;

  // Split by essay vs general
  const essayTxs = transactions.filter(tx => parseEssaySlug(tx.description));
  const generalTxs = transactions.filter(tx => !parseEssaySlug(tx.description));
  const essaySats = essayTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / MILLISATS_PER_SAT), 0);
  const generalSats = generalTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / MILLISATS_PER_SAT), 0);

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
 * @param {Transaction} tx - Raw transaction
 * @returns {Object} Simplified transaction
 */
export function simplifyTransaction(tx) {
  return {
    amount: Math.floor(tx.amount / MILLISATS_PER_SAT),
    timestamp: tx.settled_at || tx.created_at,
    description: tx.description,
    essay: parseEssaySlug(tx.description) || FOOTER_SLUG,
  };
}
