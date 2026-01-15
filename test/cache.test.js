/**
 * Tests for cache module
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  loadTransactionCache,
  saveTransactionCache,
  clearCache,
  getCacheStats,
  loadTitlesCache,
  saveTitlesCache,
  clearTitlesCache,
  getTitlesCacheInfo,
} from '../lib/cache.js';

const testDir = path.join(process.cwd(), 'test-temp');
const tempCachePath = path.join(testDir, '.test-cache.json');
const tempTitlesPath = path.join(testDir, '.test-titles-cache.json');

// Create test directory
beforeEach(() => {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
});

afterEach(() => {
  // Clean up test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

describe('Transaction Cache', () => {
  beforeEach(() => {
    // Clean up any existing test cache
    if (fs.existsSync(tempCachePath)) {
      fs.unlinkSync(tempCachePath);
    }
  });

  afterEach(() => {
    // Clean up test cache
    if (fs.existsSync(tempCachePath)) {
      fs.unlinkSync(tempCachePath);
    }
  });

  it('should return empty array when cache does not exist', () => {
    const result = loadTransactionCache(tempCachePath);
    assert.deepStrictEqual(result, []);
  });

  it('should load transactions from cache file', () => {
    const transactions = [
      { payment_hash: 'abc123', amount: 1000000, settled_at: 1700000000 },
      { payment_hash: 'def456', amount: 2000000, settled_at: 1700100000 },
    ];
    const cacheData = {
      updated: new Date().toISOString(),
      transactions,
    };

    fs.writeFileSync(tempCachePath, JSON.stringify(cacheData));

    const result = loadTransactionCache(tempCachePath);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].payment_hash, 'abc123');
    assert.strictEqual(result[1].payment_hash, 'def456');
  });

  it('should save transactions to cache', () => {
    const transactions = [
      { payment_hash: 'abc123', amount: 1000000, settled_at: 1700000000 },
    ];

    saveTransactionCache(transactions, tempCachePath);

    assert.ok(fs.existsSync(tempCachePath));
    const cacheData = JSON.parse(fs.readFileSync(tempCachePath, 'utf8'));
    assert.ok(cacheData.updated);
    assert.strictEqual(cacheData.transactions.length, 1);
  });

  it('should return false when cache does not exist on clear', () => {
    const result = clearCache(tempCachePath);
    assert.strictEqual(result, false);
  });

  it('should clear cache file', () => {
    const transactions = [{ payment_hash: 'abc123', amount: 1000000 }];
    saveTransactionCache(transactions, tempCachePath);
    assert.ok(fs.existsSync(tempCachePath));

    const result = clearCache(tempCachePath);
    assert.strictEqual(result, true);
    assert.ok(!fs.existsSync(tempCachePath));
  });

  it('should return null for stats when cache does not exist', () => {
    const result = getCacheStats(tempCachePath);
    assert.strictEqual(result, null);
  });

  it('should return cache stats when cache exists', () => {
    const transactions = [
      { payment_hash: 'abc123', amount: 1000000, settled_at: 1700000000 },
      { payment_hash: 'def456', amount: 2000000, settled_at: 1700100000 },
    ];
    saveTransactionCache(transactions, tempCachePath);

    const result = getCacheStats(tempCachePath);
    assert.ok(result);
    assert.strictEqual(result.totalTransactions, 2);
    assert.ok(result.sizeKb);
    assert.ok(result.updated);
    assert.strictEqual(result.oldest, 1700000000);
    assert.strictEqual(result.newest, 1700100000);
  });
});

describe('Titles Cache', () => {
  // Note: loadTitlesCache and saveTitlesCache use global CONFIG paths,
  // so we can't test them in isolation without modifying the module
  // These tests verify the functions work when called with real cache paths

  beforeEach(() => {
    if (fs.existsSync(tempTitlesPath)) {
      fs.unlinkSync(tempTitlesPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempTitlesPath)) {
      fs.unlinkSync(tempTitlesPath);
    }
  });

  it('should return null when cache does not exist', () => {
    // Create temp path that doesn't exist
    const result = loadTitlesCache(tempTitlesPath);
    assert.strictEqual(result, null);
  });

  it('should return null when cache is expired', () => {
    const titles = {
      'essay-one': 'Essay One Title',
      'essay-two': 'Essay Two Title',
    };
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

    fs.writeFileSync(tempTitlesPath, JSON.stringify({
      fetched: oldDate,
      titles,
    }));

    const result = loadTitlesCache(tempTitlesPath);
    assert.strictEqual(result, null);
  });

  it('should load valid titles from cache', () => {
    const titles = {
      'essay-one': 'Essay One Title',
      'essay-two': 'Essay Two Title',
    };
    const recentDate = new Date().toISOString();

    fs.writeFileSync(tempTitlesPath, JSON.stringify({
      fetched: recentDate,
      titles,
    }));

    const result = loadTitlesCache(tempTitlesPath);
    assert.ok(result);
    assert.strictEqual(result['essay-one'], 'Essay One Title');
    assert.strictEqual(result['essay-two'], 'Essay Two Title');
  });

  it('should save titles to cache', () => {
    const titles = {
      'essay-one': 'Essay One Title',
      'essay-two': 'Essay Two Title',
    };

    saveTitlesCache(titles, tempTitlesPath);

    assert.ok(fs.existsSync(tempTitlesPath));
    const cacheData = JSON.parse(fs.readFileSync(tempTitlesPath, 'utf8'));
    assert.ok(cacheData.fetched);
    assert.strictEqual(cacheData.titles['essay-one'], 'Essay One Title');
  });

  it('should return null for info when cache does not exist', () => {
    // Test with non-existent path
    const result = getTitlesCacheInfo(tempTitlesPath);
    assert.strictEqual(result, null);
  });

  it('should return titles cache info when cache exists', () => {
    const titles = {
      'essay-one': 'Essay One Title',
      'essay-two': 'Essay Two Title',
      'essay-three': 'Essay Three Title',
    };
    saveTitlesCache(titles, tempTitlesPath);

    const result = getTitlesCacheInfo(tempTitlesPath);
    assert.ok(result);
    assert.strictEqual(result.count, 3);
    assert.ok(result.fetched);
  });
});