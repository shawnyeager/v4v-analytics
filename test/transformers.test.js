/**
 * Tests for transformer functions
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  parseEssaySlug,
  filterV4VPayments,
  filterByDateRange,
  aggregateByEssay,
  aggregateByPeriod,
  buildSummary,
  simplifyTransaction,
} from '../lib/transformers.js';

// Mock site URL for tests
const TEST_SITE_URL = 'shawnyeager.com';

// Sample transactions for testing
const sampleTransactions = [
  {
    payment_hash: 'abc123',
    amount: 1000000, // 1000 sats (amount is in millisats)
    description: 'shawnyeager.com/essay-one',
    settled_at: 1700000000,
    created_at: 1699999000,
  },
  {
    payment_hash: 'def456',
    amount: 2000000, // 2000 sats
    description: 'shawnyeager.com/essay-two',
    settled_at: 1700100000,
    created_at: 1700099000,
  },
  {
    payment_hash: 'ghi789',
    amount: 500000, // 500 sats
    description: 'shawnyeager.com/essay-one',
    settled_at: 1700200000,
    created_at: 1700199000,
  },
  {
    payment_hash: 'jkl012',
    amount: 3000000, // 3000 sats
    description: 'shawnyeager.com', // footer/general
    settled_at: 1700300000,
    created_at: 1700299000,
  },
  {
    payment_hash: 'mno345',
    amount: 1500000, // 1500 sats
    description: 'other-site.com/something',
    settled_at: 1700400000,
    created_at: 1700399000,
  },
];

describe('parseEssaySlug', () => {
  it('should extract essay slug from description', () => {
    const slug = parseEssaySlug('shawnyeager.com/my-essay', TEST_SITE_URL);
    assert.strictEqual(slug, 'my-essay');
  });

  it('should return null for footer/general payments', () => {
    const slug = parseEssaySlug('shawnyeager.com', TEST_SITE_URL);
    assert.strictEqual(slug, null);
  });

  it('should return null for non-matching descriptions', () => {
    const slug = parseEssaySlug('other-site.com/essay', TEST_SITE_URL);
    assert.strictEqual(slug, null);
  });

  it('should return null for null/undefined description', () => {
    assert.strictEqual(parseEssaySlug(null, TEST_SITE_URL), null);
    assert.strictEqual(parseEssaySlug(undefined, TEST_SITE_URL), null);
  });

  it('should handle slugs with numbers and hyphens', () => {
    const slug = parseEssaySlug('shawnyeager.com/my-essay-123', TEST_SITE_URL);
    assert.strictEqual(slug, 'my-essay-123');
  });
});

describe('filterV4VPayments', () => {
  it('should filter transactions containing site URL', () => {
    const filtered = filterV4VPayments(sampleTransactions, TEST_SITE_URL);
    assert.strictEqual(filtered.length, 4);
  });

  it('should exclude transactions from other sites', () => {
    const filtered = filterV4VPayments(sampleTransactions, TEST_SITE_URL);
    const hasOtherSite = filtered.some(tx => tx.description.includes('other-site.com'));
    assert.strictEqual(hasOtherSite, false);
  });

  it('should return empty array when no matches', () => {
    const filtered = filterV4VPayments(sampleTransactions, 'nonexistent.com');
    assert.strictEqual(filtered.length, 0);
  });
});

describe('filterByDateRange', () => {
  it('should filter transactions within date range', () => {
    const from = new Date(1700050000 * 1000);
    const to = new Date(1700250000 * 1000);
    const filtered = filterByDateRange(sampleTransactions, from, to);
    assert.strictEqual(filtered.length, 2);
  });

  it('should include all transactions when no range specified', () => {
    const filtered = filterByDateRange(sampleTransactions, null, null);
    assert.strictEqual(filtered.length, 5);
  });

  it('should filter with only from date', () => {
    const from = new Date(1700200000 * 1000);
    const filtered = filterByDateRange(sampleTransactions, from, null);
    assert.strictEqual(filtered.length, 3);
  });

  it('should filter with only to date', () => {
    const to = new Date(1700100000 * 1000);
    const filtered = filterByDateRange(sampleTransactions, null, to);
    assert.strictEqual(filtered.length, 2);
  });
});

describe('aggregateByEssay', () => {
  const v4vTransactions = sampleTransactions.filter(tx =>
    tx.description.includes(TEST_SITE_URL)
  );

  it('should aggregate by essay slug', () => {
    const byEssay = aggregateByEssay(v4vTransactions, 'sats');
    assert.strictEqual(byEssay.size, 3); // essay-one, essay-two, (footer/general)
  });

  it('should calculate correct sats per essay', () => {
    const byEssay = aggregateByEssay(v4vTransactions, 'sats');
    const essayOne = byEssay.get('essay-one');
    assert.strictEqual(essayOne.sats, 1500); // 1000 + 500
    assert.strictEqual(essayOne.count, 2);
  });

  it('should sort by sats descending by default', () => {
    const byEssay = aggregateByEssay(v4vTransactions, 'sats');
    const entries = [...byEssay.entries()];
    assert.strictEqual(entries[0][0], '(footer/general)'); // 3000 sats
    assert.strictEqual(entries[1][0], 'essay-two'); // 2000 sats
    assert.strictEqual(entries[2][0], 'essay-one'); // 1500 sats
  });

  it('should sort by count when specified', () => {
    const byEssay = aggregateByEssay(v4vTransactions, 'count');
    const entries = [...byEssay.entries()];
    assert.strictEqual(entries[0][0], 'essay-one'); // 2 payments
  });

  it('should sort by recent when specified', () => {
    const byEssay = aggregateByEssay(v4vTransactions, 'recent');
    const entries = [...byEssay.entries()];
    assert.strictEqual(entries[0][0], '(footer/general)'); // most recent
  });
});

describe('aggregateByPeriod', () => {
  // Create transactions across different months
  const monthlyTransactions = [
    { amount: 1000000, settled_at: new Date('2024-01-15').getTime() / 1000, description: 'test' },
    { amount: 2000000, settled_at: new Date('2024-01-20').getTime() / 1000, description: 'test' },
    { amount: 3000000, settled_at: new Date('2024-02-10').getTime() / 1000, description: 'test' },
  ];

  it('should aggregate by monthly period', () => {
    const byPeriod = aggregateByPeriod(monthlyTransactions, 'monthly');
    assert.strictEqual(byPeriod.size, 2);
    assert.ok(byPeriod.has('2024-01'));
    assert.ok(byPeriod.has('2024-02'));
  });

  it('should calculate correct sats per period', () => {
    const byPeriod = aggregateByPeriod(monthlyTransactions, 'monthly');
    const jan = byPeriod.get('2024-01');
    assert.strictEqual(jan.sats, 3000); // 1000 + 2000
    assert.strictEqual(jan.count, 2);
  });

  it('should aggregate by daily period', () => {
    const byPeriod = aggregateByPeriod(monthlyTransactions, 'daily');
    assert.strictEqual(byPeriod.size, 3);
  });

  it('should sort by date descending', () => {
    const byPeriod = aggregateByPeriod(monthlyTransactions, 'monthly');
    const entries = [...byPeriod.entries()];
    assert.strictEqual(entries[0][0], '2024-02');
    assert.strictEqual(entries[1][0], '2024-01');
  });
});

describe('buildSummary', () => {
  const v4vTransactions = sampleTransactions.filter(tx =>
    tx.description.includes(TEST_SITE_URL)
  );

  it('should calculate total sats correctly', () => {
    const summary = buildSummary(v4vTransactions, null);
    assert.strictEqual(summary.totalSats, 6500); // 1000 + 2000 + 500 + 3000
  });

  it('should calculate payment count correctly', () => {
    const summary = buildSummary(v4vTransactions, null);
    assert.strictEqual(summary.totalPayments, 4);
  });

  it('should calculate average correctly', () => {
    const summary = buildSummary(v4vTransactions, null);
    assert.strictEqual(summary.avgSats, 1625); // 6500 / 4
  });

  it('should split essays vs general correctly', () => {
    const summary = buildSummary(v4vTransactions, null);
    assert.strictEqual(summary.essays.sats, 3500); // 1000 + 2000 + 500
    assert.strictEqual(summary.essays.payments, 3);
    assert.strictEqual(summary.general.sats, 3000);
    assert.strictEqual(summary.general.payments, 1);
  });

  it('should include USD values when btcPrice provided', () => {
    const summary = buildSummary(v4vTransactions, 50000);
    assert.ok(summary.totalUsd !== null);
    assert.strictEqual(summary.totalUsd, (6500 / 100_000_000) * 50000);
  });

  it('should return null USD when no btcPrice', () => {
    const summary = buildSummary(v4vTransactions, null);
    assert.strictEqual(summary.totalUsd, null);
  });
});

describe('simplifyTransaction', () => {
  it('should convert millisats to sats', () => {
    const simplified = simplifyTransaction(sampleTransactions[0]);
    assert.strictEqual(simplified.amount, 1000);
  });

  it('should use settled_at for timestamp', () => {
    const simplified = simplifyTransaction(sampleTransactions[0]);
    assert.strictEqual(simplified.timestamp, 1700000000);
  });

  it('should extract essay slug', () => {
    const simplified = simplifyTransaction(sampleTransactions[0]);
    assert.strictEqual(simplified.essay, 'essay-one');
  });

  it('should use footer/general for non-essay payments', () => {
    const simplified = simplifyTransaction(sampleTransactions[3]);
    assert.strictEqual(simplified.essay, '(footer/general)');
  });
});
