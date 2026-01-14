/**
 * CSV Formatter
 * Export transactions to CSV format
 */

import fs from 'fs';
import { parseEssaySlug } from '../transformers.js';

/**
 * Format transactions as CSV string
 * @param {Array} transactions - Transactions to format
 * @returns {string} CSV formatted string
 */
export function formatCSV(transactions) {
  const headers = ['date', 'amount_sats', 'essay_slug', 'description'];
  const rows = transactions.map(tx => {
    const timestamp = tx.settled_at || tx.created_at;
    const date = timestamp ? new Date(timestamp * 1000).toISOString() : '';
    const sats = Math.floor(tx.amount / 1000);
    const slug = parseEssaySlug(tx.description) || '';
    const desc = (tx.description || '').replace(/"/g, '""');
    return `${date},${sats},"${slug}","${desc}"`;
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export transactions to CSV file
 * @param {Array} transactions - Transactions to export
 * @param {string} filename - Output file path
 */
export function exportCSV(transactions, filename) {
  const csv = formatCSV(transactions);
  fs.writeFileSync(filename, csv);
  console.log(`\nExported ${transactions.length} transactions to ${filename}`);
}
