/**
 * Dashboard Command
 * Start web dashboard server
 */

import fs from 'fs';
import { CONFIG } from '../config.js';
import { fetchV4VData } from '../v4v-data.js';
import {
  aggregateByEssay,
  aggregateByPeriod,
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

      // Fetch V4V data (same as original)
      const data = await fetchV4VData({ usd: true });

      // Build aggregations
      const byEssay = aggregateByEssay(data.transactions, 'sats');
      const byMonth = aggregateByPeriod(data.transactions, 'monthly');

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

      const transactions = data.transactions.map(simplifyTransaction);

      res.json({
        summary: data.summary,
        byEssay: essayData,
        byMonth: monthlyData,
        transactions,
        btcPrice: data.btcPrice,
        essayTitles,
      });
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
