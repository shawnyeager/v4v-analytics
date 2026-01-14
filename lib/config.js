/**
 * V4V Configuration
 * Centralized configuration with environment variable overrides
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env if present
config({ path: path.join(__dirname, '..', '.env'), quiet: true });

/**
 * Configuration object with defaults and env overrides
 */
export const CONFIG = {
  // Site URL for V4V payment filtering (required)
  siteUrl: process.env.V4V_SITE_URL || null,

  // NWC connection string
  nwcConnectionString: process.env.NWC_CONNECTION_STRING || null,

  // NWC request timeout in ms
  nwcTimeout: parseInt(process.env.NWC_TIMEOUT, 10) || 120000,

  // RSS feed URL (defaults to site + /feed.xml)
  rssUrl: process.env.V4V_RSS_URL || null,

  // Maximum batches to fetch per request (limits to ~200 transactions)
  maxBatches: parseInt(process.env.V4V_MAX_BATCHES, 10) || 20,

  // Batch size for transaction fetching
  batchSize: parseInt(process.env.V4V_BATCH_SIZE, 10) || 10,

  // Delay between batches in ms
  batchDelay: parseInt(process.env.V4V_BATCH_DELAY, 10) || 300,

  // Max retries for failed requests
  maxRetries: parseInt(process.env.V4V_MAX_RETRIES, 10) || 2,

  // Titles cache TTL in ms (24 hours default)
  titlesCacheTtl: parseInt(process.env.V4V_TITLES_CACHE_TTL, 10) || 24 * 60 * 60 * 1000,

  // Cache file paths
  paths: {
    root: path.join(__dirname, '..'),
    cache: path.join(__dirname, '..', '.v4v-cache.json'),
    titlesCache: path.join(__dirname, '..', '.titles-cache.json'),
    dashboard: path.join(__dirname, '..', 'dashboard'),
  },
};

/**
 * Validate required configuration
 * @throws {Error} if required config is missing
 */
export function validateConfig() {
  if (!CONFIG.siteUrl) {
    throw new Error('V4V_SITE_URL environment variable is required');
  }
  if (!CONFIG.nwcConnectionString) {
    throw new Error('NWC_CONNECTION_STRING not found. Set it in your environment or .env file.');
  }
}

/**
 * Get RSS feed URL (computed from siteUrl if not set)
 */
export function getRssUrl() {
  if (CONFIG.rssUrl) {
    return CONFIG.rssUrl;
  }
  if (CONFIG.siteUrl) {
    return `https://${CONFIG.siteUrl.replace(/^https?:\/\//, '')}/feed.xml`;
  }
  return null;
}
