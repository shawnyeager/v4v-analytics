/**
 * Price Module
 * BTC price fetching and conversion utilities
 */

import https from 'https';

/**
 * Fetch current BTC price in USD from CoinGecko
 * @returns {Promise<number|null>} BTC price or null on error
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
 * @param {number} sats - Amount in satoshis
 * @param {number|null} btcPrice - BTC price in USD
 * @returns {number|null} USD amount or null
 */
export function satsToUsd(sats, btcPrice) {
  if (!btcPrice) return null;
  return (sats / 100_000_000) * btcPrice;
}

/**
 * Format USD amount for display
 * @param {number|null} usd - USD amount
 * @returns {string} Formatted string
 */
export function formatUsd(usd) {
  if (usd === null) return '';
  if (usd < 0.01) return ' (~$0.01)';
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
