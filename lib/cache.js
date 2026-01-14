/**
 * Cache Module
 * Transaction and titles caching functionality
 */

import fs from 'fs';
import { CONFIG } from './config.js';

/**
 * Load cached transactions
 * @returns {Array} Cached transactions or empty array
 */
export function loadTransactionCache() {
  try {
    if (fs.existsSync(CONFIG.paths.cache)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.paths.cache, 'utf8'));
      return data.transactions || [];
    }
  } catch {
    // Ignore cache errors
  }
  return [];
}

/**
 * Save transactions to cache
 * @param {Array} transactions - Transactions to cache
 */
export function saveTransactionCache(transactions) {
  try {
    fs.writeFileSync(CONFIG.paths.cache, JSON.stringify({
      updated: new Date().toISOString(),
      transactions,
    }, null, 2));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Get cache file path
 * @returns {string} Path to cache file
 */
export function getCacheFile() {
  return CONFIG.paths.cache;
}

/**
 * Clear transaction cache
 * @returns {boolean} True if cache was cleared
 */
export function clearCache() {
  try {
    if (fs.existsSync(CONFIG.paths.cache)) {
      fs.unlinkSync(CONFIG.paths.cache);
      return true;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

/**
 * Get cache statistics
 * @returns {Object|null} Cache stats or null if no cache
 */
export function getCacheStats() {
  if (!fs.existsSync(CONFIG.paths.cache)) {
    return null;
  }

  try {
    const stats = fs.statSync(CONFIG.paths.cache);
    const data = JSON.parse(fs.readFileSync(CONFIG.paths.cache, 'utf8'));
    const transactions = data.transactions || [];

    const timestamps = transactions
      .map(tx => tx.settled_at || tx.created_at)
      .filter(Boolean);

    return {
      file: CONFIG.paths.cache,
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
 * Load cached titles
 * @returns {Object|null} Cached titles or null if expired/missing
 */
export function loadTitlesCache() {
  try {
    if (fs.existsSync(CONFIG.paths.titlesCache)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.paths.titlesCache, 'utf8'));
      const age = Date.now() - new Date(data.fetched).getTime();
      if (age < CONFIG.titlesCacheTtl) {
        return data.titles;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Save titles to cache
 * @param {Object} titles - Title mappings to cache
 */
export function saveTitlesCache(titles) {
  try {
    fs.writeFileSync(CONFIG.paths.titlesCache, JSON.stringify({
      fetched: new Date().toISOString(),
      titles,
    }, null, 2));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Get titles cache file path
 * @returns {string} Path to titles cache file
 */
export function getTitlesCacheFile() {
  return CONFIG.paths.titlesCache;
}

/**
 * Clear titles cache
 * @returns {boolean} True if cache was cleared
 */
export function clearTitlesCache() {
  try {
    if (fs.existsSync(CONFIG.paths.titlesCache)) {
      fs.unlinkSync(CONFIG.paths.titlesCache);
      return true;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

/**
 * Get titles cache info
 * @returns {Object|null} Cache info or null
 */
export function getTitlesCacheInfo() {
  try {
    if (fs.existsSync(CONFIG.paths.titlesCache)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.paths.titlesCache, 'utf8'));
      return {
        count: Object.keys(data.titles || {}).length,
        fetched: data.fetched,
      };
    }
  } catch {
    // Ignore errors
  }
  return null;
}
