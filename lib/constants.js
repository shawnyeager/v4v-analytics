/**
 * Application Constants
 * Centralized magic numbers and configuration values
 */

/**
 * Bitcoin conversion constants
 */
export const MILLISATS_PER_SAT = 1000;
export const SATS_PER_BTC = 100_000_000;

/**
 * Cache defaults
 */
export const MAX_WEEKS_FOR_ALL_TIME = 52;
export const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Time units in milliseconds
 */
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

/**
 * API timeouts
 */
export const DEFAULT_NWC_TIMEOUT = 120000; // 2 minutes
export const DEFAULT_HTTP_TIMEOUT = 10000; // 10 seconds

/**
 * Batch processing
 */
export const DEFAULT_BATCH_SIZE = 10;
export const DEFAULT_BATCH_DELAY = 300; // 300ms
export const DEFAULT_MAX_BATCHES = 100; // ~1000 transactions max
export const DEFAULT_MAX_RETRIES = 2;

/**
 * Retry delays
 */
export const RETRY_BASE_DELAY = 2000; // 2 seconds

/**
 * Dashboard defaults
 */
export const DEFAULT_DASHBOARD_PORT = 3000;
export const DASHBOARD_TIME_RANGES = ['7', '30', '90', '365', 'all'];

/**
 * Payment filtering
 */
export const MIN_USD_THRESHOLD = 0.01;

/**
 * Essay slug placeholder
 */
export const FOOTER_SLUG = '(footer/general)';