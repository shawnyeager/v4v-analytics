/**
 * Input Validation Module
 * Centralized validation functions
 */

/**
 * Validate that value is a non-null object
 * @param {*} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @throws {ValidationError}
 */
export function validateObject(value, name = 'value') {
  if (value === null || typeof value !== 'object') {
    throw new Error(`${name} must be an object`);
  }
}

/**
 * Validate that value is an array
 * @param {*} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @throws {ValidationError}
 */
export function validateArray(value, name = 'value') {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

/**
 * Validate that value is a string
 * @param {*} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @throws {ValidationError}
 */
export function validateString(value, name = 'value') {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }
}

/**
 * Validate that value is a number
 * @param {*} value - Value to validate
 * @param {string} name - Parameter name for error message
 * @param {Object} [options] - Validation options
 * @param {number} [options.min] - Minimum value (inclusive)
 * @param {number} [options.max] - Maximum value (inclusive)
 * @throws {ValidationError}
 */
export function validateNumber(value, name = 'value', options = {}) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`${name} must be at least ${options.min}`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(`${name} must be at most ${options.max}`);
  }
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {string} name - Parameter name for error message
 * @returns {boolean} True if valid
 */
export function isValidUrl(url, name = 'url') {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate URL and throw if invalid
 * @param {string} url - URL to validate
 * @param {string} name - Parameter name for error message
 * @throws {ValidationError}
 */
export function validateUrl(url, name = 'url') {
  if (!url || typeof url !== 'string') {
    throw new Error(`${name} must be a non-empty string`);
  }
  if (!isValidUrl(url, name)) {
    throw new Error(`${name} must be a valid URL: ${url}`);
  }
}

/**
 * Validate date object
 * @param {Date} date - Date to validate
 * @param {string} name - Parameter name for error message
 * @throws {ValidationError}
 */
export function validateDate(date, name = 'date') {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`${name} must be a valid Date object`);
  }
}

/**
 * Validate NWC connection string format
 * @param {string} connectionString - Connection string to validate
 * @returns {boolean} True if valid format
 */
export function isValidNwcString(connectionString) {
  if (!connectionString || typeof connectionString !== 'string') {
    return false;
  }
  return connectionString.startsWith('nostr+walletconnect://');
}

/**
 * Validate NWC connection string and throw if invalid
 * @param {string} connectionString - Connection string to validate
 * @throws {ValidationError}
 */
export function validateNwcString(connectionString) {
  if (!isValidNwcString(connectionString)) {
    throw new Error('NWC connection string must start with nostr+walletconnect://');
  }
}