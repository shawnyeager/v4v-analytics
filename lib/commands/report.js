/**
 * Report Command
 * Generate V4V payment reports
 */

import { createClient } from '../nwc-client.js';
import { fetchBtcPrice } from '../price.js';
import { fetchTransactions } from '../transactions.js';
import { filterV4VPayments, filterByDateRange, parseEssaySlug } from '../transformers.js';
import { fetchEssayTitles } from '../rss-titles.js';
import { printSummary, printByEssay, printTimeSeries, printComparison } from '../formatters/text.js';
import { buildJsonReport } from '../formatters/json.js';
import { exportCSV, formatCSV } from '../formatters/csv.js';
import { parseDuration } from '../config.js';
import { dim, error as errorColor, warning } from '../colors.js';

/**
 * Execute report command
 */
export async function reportCommand(options) {
  const isQuiet = options.format === 'json' || options.format === 'csv';

  let client;
  try {
    client = createClient();
  } catch (err) {
    console.error(errorColor(`Error: ${err.message}`));
    if (err.message.includes('NWC_CONNECTION_STRING')) {
      console.error(dim('\nRun `v4v init` to set up your connection.'));
    }
    process.exit(1);
  }

  try {
    // Fetch BTC price if needed
    let btcPrice = null;
    if (options.usd) {
      btcPrice = await fetchBtcPrice();
      if (!btcPrice && !isQuiet) {
        console.log(warning('Warning: Could not fetch BTC price'));
      }
    }

    // Show progress during fetch
    let lastProgress = 0;
    const onProgress = (count) => {
      if (!isQuiet && count > lastProgress) {
        process.stdout.write(`\rFetching transactions... ${dim(`(${count} new)`)}`);
        lastProgress = count;
      }
    };

    if (!isQuiet) {
      process.stdout.write('Fetching transactions...');
    }

    let allTransactions;
    try {
      allTransactions = await fetchTransactions(client, onProgress);
    } catch (err) {
      if (!isQuiet) process.stdout.write('\r');
      console.error(errorColor(`\nError: ${err.message}`));
      if (err.message.includes('timeout')) {
        console.error(dim('\nIs your Alby Hub running?'));
      }
      process.exit(1);
    }

    if (!isQuiet) {
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line
    }

    let v4vPayments = filterV4VPayments(allTransactions);

    // Handle date filtering (--from, --to, --since)
    let fromDate = options.from ? new Date(options.from) : null;
    const toDate = options.to ? new Date(options.to + 'T23:59:59') : null;

    // --since takes precedence over --from if both provided
    if (options.since) {
      const sinceDate = parseDuration(options.since);
      if (!sinceDate) {
        console.error(errorColor(`Invalid duration: ${options.since}`));
        console.error(dim('Use formats like: 7d, 2w, 1m, 3mo, 1y'));
        process.exit(1);
      }
      fromDate = sinceDate;
    }

    if (fromDate || toDate) {
      v4vPayments = filterByDateRange(v4vPayments, fromDate, toDate);
    }

    // Handle different output formats
    if (options.format === 'json') {
      const report = buildJsonReport(v4vPayments, {
        ...options,
        fromDate,
        toDate,
      }, btcPrice);
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (options.format === 'csv') {
      const csv = formatCSV(v4vPayments);
      console.log(csv);
      return;
    }

    // Default: text format
    printSummary(v4vPayments, fromDate, toDate, btcPrice);

    if (options.byEssay) {
      const titles = await fetchEssayTitles();
      printByEssay(v4vPayments, {
        sortBy: options.sort || 'sats',
        top: options.top,
        btcPrice,
        titles,
      });
    }

    if (options.timeSeries) {
      const period = typeof options.timeSeries === 'string' ? options.timeSeries : 'monthly';
      printTimeSeries(v4vPayments, period, btcPrice);
    }

    if (options.compare) {
      const period = typeof options.timeSeries === 'string' ? options.timeSeries : 'monthly';
      printComparison(v4vPayments, period, btcPrice);
    }

    if (options.export) {
      exportCSV(v4vPayments, options.export);
    }
  } finally {
    client.close();
  }
}
