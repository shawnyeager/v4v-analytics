/**
 * Logger Module
 * Centralized logging with support for debug mode
 */

const isDebug = process.env.DEBUG === 'true' || process.env.DEBUG === '1';

/**
 * Logger interface
 */
export const logger = {
  /**
   * Log debug message (only when DEBUG is set)
   * @param {string} message - Message to log
   * @param {Object} [meta] - Additional metadata
   */
  debug(message, meta) {
    if (isDebug) {
      console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  },

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {Object} [meta] - Additional metadata
   */
  info(message, meta) {
    console.log(message, meta ? JSON.stringify(meta, null, 2) : '');
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {Object} [meta] - Additional metadata
   */
  warn(message, meta) {
    console.warn(`Warning: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Error} [error] - Error object
   */
  error(message, error) {
    console.error(`Error: ${message}`);
    if (error) {
      if (isDebug) {
        console.error(error);
      } else {
        console.error(error.message);
      }
    }
  },
};

/**
 * Check if debug mode is enabled
 * @returns {boolean}
 */
export function isDebugEnabled() {
  return isDebug;
}