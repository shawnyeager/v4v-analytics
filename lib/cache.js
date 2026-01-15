/**
 * Cache Module
 * Transaction and titles caching functionality
 */

import fs from 'fs';
import { CONFIG } from './config.js';
import { logger } from './logger.js';

/**
 * Load cached transactions
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {Array} Cached transactions or empty array
 */
export function loadTransactionCache(path = CONFIG.paths.cache) {
  try {
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      return data.transactions || [];
    }
  } catch (error) {
    logger.warn('Failed to load transaction cache', { path, error: error.message });
  }
  return [];
}

/**
 * Save transactions to cache
 * @param {Array} transactions - Transactions to cache
 * @param {string} [path] - Custom cache path (for testing)
 */
export function saveTransactionCache(transactions, path = CONFIG.paths.cache) {
  try {
    fs.writeFileSync(path, JSON.stringify({
      updated: new Date().toISOString(),
      transactions,
    }, null, 2));
  } catch (error) {
    logger.warn('Failed to save transaction cache', { path, error: error.message });
  }
}

/**
 * Get cache file path
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {string} Path to cache file
 */
export function getCacheFile(path = CONFIG.paths.cache) {
  return path;
}

/**
 * Clear transaction cache
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {boolean} True if cache was cleared
 */
export function clearCache(path = CONFIG.paths.cache) {
  try {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
      logger.debug('Cleared transaction cache');
      return true;
    }
  } catch (error) {
    logger.warn('Failed to clear transaction cache', { path, error: error.message });
  }
  return false;
}

/**
 * Get cache statistics
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {Object|null} Cache stats or null if no cache
 */
export function getCacheStats(path = CONFIG.paths.cache) {
  if (!fs.existsSync(path)) {
    return null;
  }

  try {
    const stats = fs.statSync(path);
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const transactions = data.transactions || [];

    const timestamps = transactions
      .map(tx => tx.settled_at || tx.created_at)
      .filter(Boolean);

    return {
      file: path,
      sizeKb: (stats.size / 1024).toFixed(1),
      updated: data.updated,
      totalTransactions: transactions.length,
      oldest: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newest: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  } catch (error) {
    logger.warn('Failed to get cache stats', { path, error: error.message });
    return null;
  }
}

/**
 * Load cached titles
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {Object|null} Cached titles or null if expired/missing
 */
export function loadTitlesCache(path = CONFIG.paths.titlesCache) {
  try {
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      const age = Date.now() - new Date(data.fetched).getTime();
      if (age < CONFIG.titlesCacheTtl) {
        logger.debug('Using cached titles', { count: Object.keys(data.titles || {}).length });
        return data.titles;
      }
    }
  } catch (error) {
    logger.warn('Failed to load titles cache', { path, error: error.message });
  }
  return null;
}

/**
 * Save titles to cache
 * @param {Object} titles - Title mappings to cache
 * @param {string} [path] - Custom cache path (for testing)
 */
export function saveTitlesCache(titles, path = CONFIG.paths.titlesCache) {
  try {
    fs.writeFileSync(path, JSON.stringify({
      fetched: new Date().toISOString(),
      titles,
    }, null, 2));
    logger.debug('Saved titles to cache', { count: Object.keys(titles).length });
  } catch (error) {
    logger.warn('Failed to save titles cache', { path, error: error.message });
  }
}

/**
 * Get titles cache file path
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {string} Path to titles cache file
 */
export function getTitlesCacheFile(path = CONFIG.paths.titlesCache) {
  return path;
}

/**
 * Clear titles cache
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {boolean} True if cache was cleared
 */
export function clearTitlesCache(path = CONFIG.paths.titlesCache) {
  try {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
      logger.debug('Cleared titles cache');
      return true;
    }
  } catch (error) {
    logger.warn('Failed to clear titles cache', { path, error: error.message });
  }
  return false;
}

/**
 * Get titles cache info
 * @param {string} [path] - Custom cache path (for testing)
 * @returns {Object|null} Cache info or null
 */
export function getTitlesCacheInfo(path = CONFIG.paths.titlesCache) {
  try {
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      return {
        count: Object.keys(data.titles || {}).length,
        fetched: data.fetched,
      };
    }
  } catch (error) {
    logger.warn('Failed to get titles cache info', { path, error: error.message });
  }
  return null;
}
