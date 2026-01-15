/**
 * V4V Configuration
 * Centralized configuration with environment variable overrides
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_NWC_TIMEOUT,
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_DELAY,
  DEFAULT_MAX_BATCHES,
  DEFAULT_MAX_RETRIES,
  DEFAULT_CACHE_TTL,
} from './constants.js';
import { logger } from './logger.js';

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
  nwcTimeout: parseInt(process.env.NWC_TIMEOUT, 10) || DEFAULT_NWC_TIMEOUT,

  // RSS feed URL (defaults to site + /feed.xml)
  rssUrl: process.env.V4V_RSS_URL || null,

  // Maximum batches to fetch per request (limits to ~200 transactions)
  maxBatches: parseInt(process.env.V4V_MAX_BATCHES, 10) || DEFAULT_MAX_BATCHES,

  // Batch size for transaction fetching
  batchSize: parseInt(process.env.V4V_BATCH_SIZE, 10) || DEFAULT_BATCH_SIZE,

  // Delay between batches in ms
  batchDelay: parseInt(process.env.V4V_BATCH_DELAY, 10) || DEFAULT_BATCH_DELAY,

  // Max retries for failed requests
  maxRetries: parseInt(process.env.V4V_MAX_RETRIES, 10) || DEFAULT_MAX_RETRIES,

  // Titles cache TTL in ms (24 hours default)
  titlesCacheTtl: parseInt(process.env.V4V_TITLES_CACHE_TTL, 10) || DEFAULT_CACHE_TTL,

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

  // Validate URL format
  try {
    new URL(`https://${CONFIG.siteUrl}`);
  } catch (error) {
    throw new Error(`Invalid V4V_SITE_URL: ${CONFIG.siteUrl}`);
  }

  if (!CONFIG.nwcConnectionString) {
    throw new Error('NWC_CONNECTION_STRING not found. Set it in your environment or .env file.');
  }

  // Validate NWC connection string format
  if (!CONFIG.nwcConnectionString.startsWith('nostr+walletconnect://')) {
    throw new Error('NWC_CONNECTION_STRING must start with nostr+walletconnect://');
  }

  logger.debug('Configuration validated', {
    siteUrl: CONFIG.siteUrl,
    hasRss: !!CONFIG.rssUrl,
    nwcTimeout: CONFIG.nwcTimeout,
  });
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

/**
 * Parse a duration string into a Date (relative to now)
 * Supports: 7d, 2w, 1m, 3mo, 1y
 * @param {string} duration - Duration string
 * @returns {Date|null} Date in the past, or null if invalid
 */
export function parseDuration(duration) {
  if (!duration) return null;

  const match = duration.match(/^(\d+)(d|w|m|mo|y)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const now = new Date();
  const result = new Date(now);

  switch (unit) {
    case 'd':
      result.setDate(now.getDate() - value);
      break;
    case 'w':
      result.setDate(now.getDate() - value * 7);
      break;
    case 'm':
    case 'mo':
      result.setMonth(now.getMonth() - value);
      break;
    case 'y':
      result.setFullYear(now.getFullYear() - value);
      break;
    default:
      return null;
  }

  return result;
}
