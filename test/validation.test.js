/**
 * Tests for validation module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateObject,
  validateArray,
  validateString,
  validateNumber,
  isValidUrl,
  validateUrl,
  validateDate,
  isValidNwcString,
  validateNwcString,
} from '../lib/validation.js';

describe('validateObject', () => {
  it('should validate valid object', () => {
    assert.doesNotThrow(() => validateObject({ foo: 'bar' }));
  });

  it('should throw for null', () => {
    assert.throws(() => validateObject(null), /must be an object/);
  });

  it('should throw for non-object', () => {
    assert.throws(() => validateObject('string'), /must be an object/);
    assert.throws(() => validateObject(123), /must be an object/);
  });
});

describe('validateArray', () => {
  it('should validate valid array', () => {
    assert.doesNotThrow(() => validateArray([1, 2, 3]));
  });

  it('should throw for non-array', () => {
    assert.throws(() => validateArray('string'), /must be an array/);
    assert.throws(() => validateArray({}), /must be an array/);
  });
});

describe('validateString', () => {
  it('should validate valid string', () => {
    assert.doesNotThrow(() => validateString('hello'));
  });

  it('should throw for non-string', () => {
    assert.throws(() => validateString(123), /must be a string/);
    assert.throws(() => validateString({}), /must be a string/);
  });
});

describe('validateNumber', () => {
  it('should validate valid number', () => {
    assert.doesNotThrow(() => validateNumber(42));
  });

  it('should throw for non-number', () => {
    assert.throws(() => validateNumber('42'), /must be a number/);
    assert.throws(() => validateNumber(NaN), /must be a number/);
  });

  it('should respect min option', () => {
    assert.doesNotThrow(() => validateNumber(42, 'value', { min: 0 }));
    assert.doesNotThrow(() => validateNumber(0, 'value', { min: 0 }));
    assert.throws(() => validateNumber(-1, 'value', { min: 0 }), /at least 0/);
  });

  it('should respect max option', () => {
    assert.doesNotThrow(() => validateNumber(42, 'value', { max: 100 }));
    assert.doesNotThrow(() => validateNumber(100, 'value', { max: 100 }));
    assert.throws(() => validateNumber(101, 'value', { max: 100 }), /at most 100/);
  });
});

describe('isValidUrl', () => {
  it('should return true for valid URLs', () => {
    assert.strictEqual(isValidUrl('https://example.com'), true);
    assert.strictEqual(isValidUrl('http://example.com'), true);
    assert.strictEqual(isValidUrl('https://example.com/path'), true);
  });

  it('should return false for invalid URLs', () => {
    assert.strictEqual(isValidUrl('not-a-url'), false);
    assert.strictEqual(isValidUrl(''), false);
    assert.strictEqual(isValidUrl('example.com'), false);
  });
});

describe('validateUrl', () => {
  it('should validate valid URL', () => {
    assert.doesNotThrow(() => validateUrl('https://example.com'));
  });

  it('should throw for invalid URL', () => {
    assert.throws(() => validateUrl('not-a-url'), /must be a valid URL/);
  });

  it('should throw for empty string', () => {
    assert.throws(() => validateUrl(''), /must be a non-empty string/);
  });
});

describe('validateDate', () => {
  it('should validate valid date', () => {
    const date = new Date();
    assert.doesNotThrow(() => validateDate(date));
  });

  it('should throw for invalid date', () => {
    assert.throws(() => validateDate(new Date('invalid')), /must be a valid Date/);
  });

  it('should throw for non-date', () => {
    assert.throws(() => validateDate('2024-01-01'), /must be a valid Date/);
  });
});

describe('isValidNwcString', () => {
  it('should return true for valid NWC strings', () => {
    assert.strictEqual(isValidNwcString('nostr+walletconnect://abc123'), true);
    assert.strictEqual(isValidNwcString('nostr+walletconnect://longstringhere'), true);
  });

  it('should return false for invalid NWC strings', () => {
    assert.strictEqual(isValidNwcString(''), false);
    assert.strictEqual(isValidNwcString('not-nwc'), false);
    assert.strictEqual(isValidNwcString('walletconnect://nostr'), false);
  });

  it('should return false for null/undefined', () => {
    assert.strictEqual(isValidNwcString(null), false);
    assert.strictEqual(isValidNwcString(undefined), false);
  });
});

describe('validateNwcString', () => {
  it('should validate valid NWC string', () => {
    assert.doesNotThrow(() => validateNwcString('nostr+walletconnect://abc123'));
  });

  it('should throw for invalid NWC string', () => {
    assert.throws(() => validateNwcString('not-nwc'), /must start with nostr\+walletconnect:\/\//);
  });

  it('should throw for empty string', () => {
    assert.throws(() => validateNwcString(''), /must start with nostr\+walletconnect:\/\//);
  });
});