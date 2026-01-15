/**
 * Custom Error Classes
 * Standardized error types for better error handling
 */

/**
 * Configuration error - missing or invalid configuration
 */
export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
    this.code = 'CONFIG_ERROR';
  }
}

/**
 * Network error - API/network request failed
 */
export class NetworkError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'NetworkError';
    this.code = 'NETWORK_ERROR';
    this.cause = cause;
  }
}

/**
 * Validation error - invalid input
 */
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.field = field;
  }
}

/**
 * Cache error - cache read/write failed
 */
export class CacheError extends Error {
  constructor(message, operation) {
    super(message);
    this.name = 'CacheError';
    this.code = 'CACHE_ERROR';
    this.operation = operation;
  }
}

/**
 * Parse error - failed to parse data (RSS, XML, etc.)
 */
export class ParseError extends Error {
  constructor(message, data) {
    super(message);
    this.name = 'ParseError';
    this.code = 'PARSE_ERROR';
    this.data = data;
  }
}