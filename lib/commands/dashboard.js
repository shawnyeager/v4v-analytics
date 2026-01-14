/**
 * Dashboard Command
 * Start web dashboard server
 */

import fs from 'fs';
import { CONFIG } from '../config.js';
import { fetchBtcPrice } from '../price.js';
import { createClient } from '../nwc-client.js';
import { fetchTransactions } from '../transactions.js';
import {
  filterV4VPayments,
  aggregateByEssay,
  aggregateByPeriod,
  buildSummary,
  simplifyTransaction,
} from '../transformers.js';
import { fetchEssayTitles } from '../rss-titles.js';

/**
 * Start dashboard server
 */
export async function dashboardCommand(options) {
  const express = (await import('express')).default;
  const port = parseInt(options.port, 10);
  const app = express();

  app.use(express.static(CONFIG.paths.dashboard));

  app.get('/api/data', async (req, res) => {
    // Serve mock data for screenshots/demos
    if (options.mock) {
      const mockPath = `${CONFIG.paths.dashboard}/mock-data.json`;
      const mockData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      return res.json(mockData);
    }

    try {
      // Fetch essay titles from RSS (cached)
      const essayTitles = await fetchEssayTitles();

      // Fetch BTC price
      const btcPrice = await fetchBtcPrice();

      // Create client and fetch transactions
      const client = createClient();
      try {
        const allTransactions = await fetchTransactions(client);
        const v4vPayments = filterV4VPayments(allTransactions);

        // Build aggregations
        const byEssay = aggregateByEssay(v4vPayments, 'sats');
        const byMonth = aggregateByPeriod(v4vPayments, 'monthly');

        const essayData = [...byEssay.entries()].map(([slug, d]) => ({
          slug,
          sats: d.sats,
          count: d.count,
          lastPayment: d.lastPayment,
        }));

        const monthlyData = [...byMonth.entries()].map(([month, d]) => ({
          month,
          sats: d.sats,
          count: d.count,
        }));

        const transactions = v4vPayments.map(simplifyTransaction);
        const summary = buildSummary(v4vPayments, btcPrice);

        res.json({
          summary,
          byEssay: essayData,
          byMonth: monthlyData,
          transactions,
          btcPrice,
          essayTitles,
        });
      } finally {
        client.close();
      }
    } catch (error) {
      console.error('Error fetching data:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(port, () => {
    console.log(`V4V Dashboard running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
  });
}
