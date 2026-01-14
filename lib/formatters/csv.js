/**
 * CSV Formatter
 * Export transactions to CSV format
 */

import fs from 'fs';
import { parseEssaySlug } from '../transformers.js';

/**
 * Export transactions to CSV file
 */
export function exportCSV(transactions, filename) {
  const headers = ['date', 'amount_sats', 'essay_slug', 'description'];
  const rows = transactions.map(tx => {
    const timestamp = tx.settled_at || tx.created_at;
    const date = timestamp ? new Date(timestamp * 1000).toISOString() : '';
    const sats = Math.floor(tx.amount / 1000);
    const slug = parseEssaySlug(tx.description) || '';
    const desc = (tx.description || '').replace(/"/g, '""');
    return `${date},${sats},"${slug}","${desc}"`;
  });

  const csv = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(filename, csv);
  console.log(`\nExported ${transactions.length} transactions to ${filename}`);
}
