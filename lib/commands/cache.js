/**
 * Cache Command
 * Manage transaction and titles cache
 */

import {
  getCacheStats,
  clearCache,
  getTitlesCacheInfo,
  clearTitlesCache,
} from '../cache.js';

/**
 * Show cache statistics
 */
export function showCacheStats() {
  const stats = getCacheStats();

  if (!stats) {
    console.log('No transaction cache found.');
  } else {
    console.log('\nV4V Cache Statistics');
    console.log('====================');
    console.log(`File: ${stats.file}`);
    console.log(`Size: ${stats.sizeKb} KB`);
    console.log(`Last updated: ${stats.updated || 'unknown'}`);
    console.log(`Total transactions: ${stats.totalTransactions}`);

    if (stats.oldest && stats.newest) {
      const oldestDate = new Date(stats.oldest * 1000).toISOString().split('T')[0];
      const newestDate = new Date(stats.newest * 1000).toISOString().split('T')[0];
      console.log(`Date range: ${oldestDate} to ${newestDate}`);
    }
  }

  // Show titles cache info too
  const titlesInfo = getTitlesCacheInfo();
  if (titlesInfo) {
    console.log(`\nTitles cache: ${titlesInfo.count} titles`);
    console.log(`Fetched: ${titlesInfo.fetched}`);
  }
}

/**
 * Clear all caches
 */
export function doClearCache() {
  const transactionsCleared = clearCache();
  if (transactionsCleared) {
    console.log('Transaction cache cleared.');
  } else {
    console.log('No transaction cache to clear.');
  }

  const titlesCleared = clearTitlesCache();
  if (titlesCleared) {
    console.log('Titles cache cleared.');
  }
}

/**
 * Execute cache command
 */
export function cacheCommand(options) {
  if (options.clear) {
    doClearCache();
  } else {
    showCacheStats();
  }
}
