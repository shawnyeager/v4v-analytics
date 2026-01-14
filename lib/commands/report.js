/**
 * Report Command
 * Generate V4V payment reports
 */

import { createClient } from '../nwc-client.js';
import { fetchBtcPrice } from '../price.js';
import { fetchTransactions } from '../transactions.js';
import { filterV4VPayments, filterByDateRange } from '../transformers.js';
import { fetchEssayTitles } from '../rss-titles.js';
import { printSummary, printByEssay, printTimeSeries, printComparison } from '../formatters/text.js';
import { buildJsonReport } from '../formatters/json.js';
import { exportCSV } from '../formatters/csv.js';

/**
 * Execute report command
 */
export async function reportCommand(options) {
  let client;
  try {
    client = createClient();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  try {
    let btcPrice = null;
    if (options.usd) {
      btcPrice = await fetchBtcPrice();
      if (!btcPrice && options.format !== 'json') {
        console.log('Warning: Could not fetch BTC price');
      }
    }

    if (options.format !== 'json') {
      console.log('Fetching transactions...');
    }

    let allTransactions;
    try {
      allTransactions = await fetchTransactions(client);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    let v4vPayments = filterV4VPayments(allTransactions);

    const fromDate = options.from ? new Date(options.from) : null;
    const toDate = options.to ? new Date(options.to + 'T23:59:59') : null;

    if (fromDate || toDate) {
      v4vPayments = filterByDateRange(v4vPayments, fromDate, toDate);
    }

    if (options.format === 'json') {
      const report = buildJsonReport(v4vPayments, {
        ...options,
        fromDate,
        toDate,
      }, btcPrice);
      console.log(JSON.stringify(report, null, 2));
      return;
    }

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
