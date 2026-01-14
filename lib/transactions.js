/**
 * Transactions Module
 * Transaction fetching from NWC with caching
 */

import { CONFIG } from './config.js';
import { loadTransactionCache, saveTransactionCache } from './cache.js';

/**
 * Fetch transactions from NWC (recent only, uses cache)
 * @param {Object} client - NWC client instance
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Array>} Merged transactions (new + cached)
 */
export async function fetchTransactions(client, onProgress = null) {
  const cached = loadTransactionCache();
  const latestCached = cached.length > 0
    ? Math.max(...cached.map(tx => tx.settled_at || tx.created_at || 0))
    : 0;

  const newTransactions = [];
  let offset = 0;
  const { batchSize: limit, batchDelay: baseDelay, maxRetries, maxBatches } = CONFIG;
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
  saveTransactionCache(merged);

  return merged;
}
