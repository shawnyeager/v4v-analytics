/**
 * Text Formatter
 * CLI text output formatting
 */

import { formatNumber, formatUsd, satsToUsd } from '../price.js';
import { parseEssaySlug, aggregateByEssay, aggregateByPeriod } from '../transformers.js';

/**
 * Print summary to console
 */
export function printSummary(transactions, fromDate, toDate, btcPrice = null) {
  const totalSats = transactions.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);
  const avgSats = transactions.length > 0 ? Math.round(totalSats / transactions.length) : 0;

  const essayTxs = transactions.filter(tx => parseEssaySlug(tx.description));
  const generalTxs = transactions.filter(tx => !parseEssaySlug(tx.description));
  const essaySats = essayTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);
  const generalSats = generalTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);

  console.log('\nV4V Payment Report');
  console.log('==================');

  if (fromDate || toDate) {
    const from = fromDate ? fromDate.toISOString().split('T')[0] : 'beginning';
    const to = toDate ? toDate.toISOString().split('T')[0] : 'now';
    console.log(`Period: ${from} to ${to}`);
  } else {
    console.log('Period: All time');
  }

  const totalUsd = formatUsd(satsToUsd(totalSats, btcPrice));
  const avgUsd = formatUsd(satsToUsd(avgSats, btcPrice));

  console.log(`Total received: ${formatNumber(totalSats)} sats${totalUsd} (${formatNumber(transactions.length)} payments)`);
  console.log(`  Essays:  ${formatNumber(essaySats).padStart(10)} sats${formatUsd(satsToUsd(essaySats, btcPrice))} (${essayTxs.length} payments)`);
  console.log(`  General: ${formatNumber(generalSats).padStart(10)} sats${formatUsd(satsToUsd(generalSats, btcPrice))} (${generalTxs.length} payments)`);
  console.log(`Average: ${formatNumber(avgSats)} sats${avgUsd}`);

  if (btcPrice) {
    console.log(`BTC price: $${formatNumber(btcPrice)}`);
  }
}

/**
 * Print breakdown by essay
 */
export function printByEssay(transactions, { sortBy = 'sats', top = null, btcPrice = null, titles = {} } = {}) {
  const byEssay = aggregateByEssay(transactions, sortBy);
  let entries = [...byEssay.entries()];

  if (top) {
    entries = entries.slice(0, top);
  }

  const sortLabel = { sats: 'by sats', count: 'by count', recent: 'by recent' }[sortBy];
  console.log(`\nBy Essay (${sortLabel}):`);

  for (const [slug, data] of entries) {
    // Use fetched title if available, otherwise use slug
    const displayName = slug === '(footer/general)' ? slug : (titles[`essays/${slug}`] || titles[slug] || slug);
    const paddedName = displayName.slice(0, 40).padEnd(40);
    const usd = formatUsd(satsToUsd(data.sats, btcPrice));
    console.log(`  ${paddedName} ${formatNumber(data.sats).padStart(10)} sats${usd} (${data.count} payments)`);
  }

  if (top && byEssay.size > top) {
    console.log(`  ... and ${byEssay.size - top} more`);
  }
}

/**
 * Print time series data
 */
export function printTimeSeries(transactions, period, btcPrice = null) {
  const byPeriod = aggregateByPeriod(transactions, period);

  console.log(`\n${period.charAt(0).toUpperCase() + period.slice(1)} Trend:`);
  for (const [date, data] of byPeriod) {
    const usd = formatUsd(satsToUsd(data.sats, btcPrice));
    console.log(`  ${date}  ${formatNumber(data.sats).padStart(10)} sats${usd} (${data.count} payments)`);
  }
}

/**
 * Print period comparison
 */
export function printComparison(transactions, period, btcPrice = null) {
  const byPeriod = aggregateByPeriod(transactions, period);
  const periods = [...byPeriod.entries()];

  if (periods.length < 2) {
    console.log('\nComparison: Not enough data (need at least 2 periods)');
    return;
  }

  const [currentKey, current] = periods[0];
  const [previousKey, previous] = periods[1];

  const satsDelta = current.sats - previous.sats;
  const satsPercent = previous.sats > 0 ? ((satsDelta / previous.sats) * 100).toFixed(1) : 'N/A';
  const countDelta = current.count - previous.count;
  const countPercent = previous.count > 0 ? ((countDelta / previous.count) * 100).toFixed(1) : 'N/A';

  const satsSign = satsDelta >= 0 ? '+' : '';
  const countSign = countDelta >= 0 ? '+' : '';

  console.log(`\nComparison (${currentKey} vs ${previousKey}):`);
  console.log(`  Sats:     ${formatNumber(current.sats).padStart(10)} vs ${formatNumber(previous.sats).padStart(10)}  (${satsSign}${satsPercent}%)`);
  console.log(`  Payments: ${formatNumber(current.count).padStart(10)} vs ${formatNumber(previous.count).padStart(10)}  (${countSign}${countPercent}%)`);

  if (btcPrice) {
    const currentUsd = satsToUsd(current.sats, btcPrice);
    const previousUsd = satsToUsd(previous.sats, btcPrice);
    console.log(`  USD:      $${currentUsd.toFixed(2).padStart(9)} vs $${previousUsd.toFixed(2).padStart(9)}`);
  }
}
