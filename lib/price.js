/**
 * Price Module
 * BTC price fetching and conversion utilities
 */

import https from 'https';
import { SATS_PER_BTC, MIN_USD_THRESHOLD, DEFAULT_HTTP_TIMEOUT } from './constants.js';
import { logger } from './logger.js';

/**
 * Fetch current BTC price in USD from CoinGecko
 * @returns {Promise<number|null>} BTC price or null on error
 */
export async function fetchBtcPrice() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.coingecko.com',
      path: '/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      headers: { 'User-Agent': 'v4v-analytics/1.0' },
      timeout: DEFAULT_HTTP_TIMEOUT,
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const price = json.bitcoin?.usd || null;
          if (price) {
            logger.debug('Fetched BTC price', { price });
          }
          resolve(price);
        } catch (error) {
          logger.warn('Failed to parse BTC price response', { error: error.message });
          resolve(null);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      logger.warn('BTC price fetch timed out');
      resolve(null);
    });
    req.on('error', (error) => {
      logger.warn('Failed to fetch BTC price', { error: error.message });
      resolve(null);
    });
  });
}

/**
 * Convert sats to USD
 * @param {number} sats - Amount in satoshis
 * @param {number|null} btcPrice - BTC price in USD
 * @returns {number|null} USD amount or null
 */
export function satsToUsd(sats, btcPrice) {
  if (!btcPrice) return null;
  return (sats / SATS_PER_BTC) * btcPrice;
}

/**
 * Format USD amount for display
 * @param {number|null} usd - USD amount
 * @returns {string} Formatted string
 */
export function formatUsd(usd) {
  if (usd === null) return '';
  if (usd < MIN_USD_THRESHOLD) return ` (~$${MIN_USD_THRESHOLD.toFixed(2)})`;
  return ` (~$${usd.toFixed(2)})`;
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted string
 */
export function formatNumber(num) {
  return num.toLocaleString();
}
