/**
 * Text Formatter
 * CLI text output formatting with colors
 */

import { formatNumber, formatUsd, satsToUsd } from '../price.js';
import { buildSummary, aggregateByEssay, aggregateByPeriod } from '../transformers.js';
import { bold, dim, cyan, yellow, green, red, sats as satsColor, trend } from '../colors.js';

/**
 * Print summary to console
 */
export function printSummary(transactions, fromDate, toDate, btcPrice = null) {
  const summary = buildSummary(transactions, btcPrice);

  console.log(bold('\nV4V Payment Report'));
  console.log(dim('═'.repeat(40)));

  if (fromDate || toDate) {
    const from = fromDate ? fromDate.toISOString().split('T')[0] : 'beginning';
    const to = toDate ? toDate.toISOString().split('T')[0] : 'now';
    console.log(`Period: ${dim(from + ' to ' + to)}`);
  } else {
    console.log(`Period: ${dim('All time')}`);
  }

  const totalUsdStr = summary.totalUsd ? yellow(` (~$${summary.totalUsd.toFixed(2)})`) : '';
  const avgUsdStr = summary.avgUsd ? yellow(` (~$${summary.avgUsd.toFixed(2)})`) : '';
  const essayUsdStr = summary.essays.usd ? yellow(` (~$${summary.essays.usd.toFixed(2)})`) : '';
  const generalUsdStr = summary.general.usd ? yellow(` (~$${generalUsdStr.toFixed(2)})`) : '';

  console.log(`Total received: ${satsColor(formatNumber(summary.totalSats))} sats${totalUsdStr} ${dim(`(${formatNumber(summary.totalPayments)} payments)`)}`);
  console.log(`  Essays:  ${satsColor(formatNumber(summary.essays.sats).padStart(10))} sats${essayUsdStr} ${dim(`(${summary.essays.payments} payments)`)}`);
  console.log(`  General: ${satsColor(formatNumber(summary.general.sats).padStart(10))} sats${generalUsdStr} ${dim(`(${summary.general.payments} payments)`)}`);
  console.log(`Average: ${satsColor(formatNumber(summary.avgSats))} sats${avgUsdStr}`);

  if (btcPrice) {
    console.log(`BTC price: ${yellow('$' + formatNumber(btcPrice))}`);
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
  console.log(bold(`\nBy Essay`) + dim(` (${sortLabel}):`));

  for (const [slug, data] of entries) {
    // Use fetched title if available, otherwise use slug
    const displayName = slug === '(footer/general)' ? dim(slug) : (titles[`essays/${slug}`] || titles[slug] || slug);
    const paddedName = String(displayName).slice(0, 40).padEnd(40);
    const usdVal = satsToUsd(data.sats, btcPrice);
    const usdStr = usdVal ? yellow(` (~$${usdVal.toFixed(2)})`) : '';
    console.log(`  ${paddedName} ${satsColor(formatNumber(data.sats).padStart(10))} sats${usdStr} ${dim(`(${data.count})`)}`);
  }

  if (top && byEssay.size > top) {
    console.log(dim(`  ... and ${byEssay.size - top} more`));
  }
}

/**
 * Print time series data
 */
export function printTimeSeries(transactions, period, btcPrice = null) {
  const byPeriod = aggregateByPeriod(transactions, period);

  console.log(bold(`\n${period.charAt(0).toUpperCase() + period.slice(1)} Trend:`));
  
  for (const [date, data] of byPeriod) {
    const usdVal = satsToUsd(data.sats, btcPrice);
    const usdStr = usdVal ? yellow(` (~$${usdVal.toFixed(2)})`) : '';
    console.log(`  ${dim(date)}  ${satsColor(formatNumber(data.sats).padStart(10))} sats${usdStr} ${dim(`(${data.count})`)}`);
  }
}

/**
 * Print period comparison
 */
export function printComparison(transactions, period, btcPrice = null) {
  const byPeriod = aggregateByPeriod(transactions, period);
  const periods = [...byPeriod.entries()];

  if (periods.length < 2) {
    console.log(dim('\nComparison: Not enough data (need at least 2 periods)'));
    return;
  }

  const [currentKey, current] = periods[0];
  const [previousKey, previous] = periods[1];

  const satsDelta = current.sats - previous.sats;
  const satsPercent = previous.sats > 0 ? ((satsDelta / previous.sats) * 100).toFixed(1) : null;
  const countDelta = current.count - previous.count;
  const countPercent = previous.count > 0 ? ((countDelta / previous.count) * 100).toFixed(1) : null;

  console.log(bold(`\nComparison`) + dim(` (${currentKey} vs ${previousKey}):`));
  console.log(`  Sats:     ${satsColor(formatNumber(current.sats).padStart(10))} vs ${dim(formatNumber(previous.sats).padStart(10))}  ${trend(satsPercent)}`);
  console.log(`  Payments: ${formatNumber(current.count).padStart(10)} vs ${dim(formatNumber(previous.count).padStart(10))}  ${trend(countPercent)}`);

  if (btcPrice) {
    const currentUsd = satsToUsd(current.sats, btcPrice);
    const previousUsd = satsToUsd(previous.sats, btcPrice);
    console.log(`  USD:      ${yellow('$' + currentUsd.toFixed(2).padStart(9))} vs ${dim('$' + previousUsd.toFixed(2).padStart(9))}`);
  }
}
