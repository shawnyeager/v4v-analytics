/**
 * V4V Data Library
 * Facade module that re-exports from specialized modules
 * Provides backwards compatibility for existing consumers
 */

// Re-export from config
export { CONFIG, validateConfig, getRssUrl } from './config.js';

// Re-export from nwc-client
export { createClient } from './nwc-client.js';

// Re-export from price
export { fetchBtcPrice, satsToUsd, formatUsd, formatNumber } from './price.js';

// Re-export from cache
export {
  loadTransactionCache,
  saveTransactionCache,
  getCacheFile,
  clearCache,
  getCacheStats,
  loadTitlesCache,
  saveTitlesCache,
  getTitlesCacheFile,
  clearTitlesCache,
  getTitlesCacheInfo,
} from './cache.js';

// Re-export from transactions
export { fetchTransactions } from './transactions.js';

// Re-export from transformers
export {
  parseEssaySlug,
  filterV4VPayments,
  filterByDateRange,
  aggregateByEssay,
  aggregateByPeriod,
  buildSummary,
  simplifyTransaction,
} from './transformers.js';

/**
 * Fetch all V4V data in one call
 * High-level convenience function
 */
import { createClient } from './nwc-client.js';
import { fetchBtcPrice } from './price.js';
import { fetchTransactions } from './transactions.js';
import { filterV4VPayments, filterByDateRange, buildSummary } from './transformers.js';

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
