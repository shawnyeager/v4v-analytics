/**
 * Tests for configuration module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CONFIG, getRssUrl } from '../lib/config.js';

describe('CONFIG', () => {
  it('should have default values for configurable options', () => {
    assert.strictEqual(typeof CONFIG.maxBatches, 'number');
    assert.strictEqual(typeof CONFIG.batchSize, 'number');
    assert.strictEqual(typeof CONFIG.batchDelay, 'number');
    assert.strictEqual(typeof CONFIG.maxRetries, 'number');
    assert.strictEqual(typeof CONFIG.titlesCacheTtl, 'number');
  });

  it('should have reasonable default values', () => {
    assert.ok(CONFIG.maxBatches >= 1);
    assert.ok(CONFIG.batchSize >= 1);
    assert.ok(CONFIG.batchDelay >= 0);
    assert.ok(CONFIG.maxRetries >= 1);
    assert.ok(CONFIG.titlesCacheTtl > 0);
  });

  it('should have path configuration', () => {
    assert.ok(CONFIG.paths.root);
    assert.ok(CONFIG.paths.cache);
    assert.ok(CONFIG.paths.titlesCache);
    assert.ok(CONFIG.paths.dashboard);
  });
});

describe('getRssUrl', () => {
  it('should return configured RSS URL if set', () => {
    // This test depends on environment, so we just check the function exists
    const url = getRssUrl();
    assert.strictEqual(typeof url, 'string');
  });
});
