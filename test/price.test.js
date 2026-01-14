/**
 * Tests for price utility functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { satsToUsd, formatUsd, formatNumber } from '../lib/price.js';

describe('satsToUsd', () => {
  it('should convert sats to USD correctly', () => {
    const usd = satsToUsd(100000, 50000); // 100k sats at $50k BTC
    assert.strictEqual(usd, 50); // $50
  });

  it('should return null when no btcPrice', () => {
    const usd = satsToUsd(100000, null);
    assert.strictEqual(usd, null);
  });

  it('should handle small amounts', () => {
    const usd = satsToUsd(100, 50000); // 100 sats
    assert.ok(Math.abs(usd - 0.05) < 0.0001); // Use approximate comparison for floats
  });

  it('should handle zero sats', () => {
    const usd = satsToUsd(0, 50000);
    assert.strictEqual(usd, 0);
  });
});

describe('formatUsd', () => {
  it('should format USD with two decimals', () => {
    const formatted = formatUsd(50.00);
    assert.strictEqual(formatted, ' (~$50.00)');
  });

  it('should return empty string for null', () => {
    const formatted = formatUsd(null);
    assert.strictEqual(formatted, '');
  });

  it('should show ~$0.01 for very small amounts', () => {
    const formatted = formatUsd(0.001);
    assert.strictEqual(formatted, ' (~$0.01)');
  });

  it('should format amounts under $0.01 as ~$0.01', () => {
    const formatted = formatUsd(0.005);
    assert.strictEqual(formatted, ' (~$0.01)');
  });
});

describe('formatNumber', () => {
  it('should format numbers with commas', () => {
    const formatted = formatNumber(1000000);
    assert.ok(formatted.includes(',') || formatted.includes('.') || formatted.includes(' '));
  });

  it('should handle small numbers', () => {
    const formatted = formatNumber(100);
    assert.strictEqual(formatted, '100');
  });

  it('should handle zero', () => {
    const formatted = formatNumber(0);
    assert.strictEqual(formatted, '0');
  });
});
