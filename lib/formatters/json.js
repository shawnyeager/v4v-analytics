/**
 * JSON Formatter
 * Build JSON report for CLI output
 */

import { satsToUsd } from '../price.js';
import { aggregateByEssay, aggregateByPeriod, parseEssaySlug } from '../transformers.js';

/**
 * Build JSON report from transactions
 */
export function buildJsonReport(transactions, options, btcPrice) {
  const totalSats = transactions.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);
  const avgSats = transactions.length > 0 ? Math.round(totalSats / transactions.length) : 0;

  const essayTxs = transactions.filter(tx => parseEssaySlug(tx.description));
  const generalTxs = transactions.filter(tx => !parseEssaySlug(tx.description));
  const essaySats = essayTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);
  const generalSats = generalTxs.reduce((sum, tx) => sum + Math.floor(tx.amount / 1000), 0);

  const report = {
    summary: {
      totalSats,
      totalPayments: transactions.length,
      averageSats: avgSats,
      essays: { sats: essaySats, payments: essayTxs.length },
      general: { sats: generalSats, payments: generalTxs.length },
      period: {
        from: options.fromDate?.toISOString().split('T')[0] || null,
        to: options.toDate?.toISOString().split('T')[0] || null,
      },
    },
  };

  if (btcPrice) {
    report.summary.btcPrice = btcPrice;
    report.summary.totalUsd = satsToUsd(totalSats, btcPrice);
    report.summary.essays.usd = satsToUsd(essaySats, btcPrice);
    report.summary.general.usd = satsToUsd(generalSats, btcPrice);
  }

  if (options.byEssay) {
    const byEssay = aggregateByEssay(transactions, options.sort);
    let entries = [...byEssay.entries()];
    if (options.top) entries = entries.slice(0, options.top);

    report.byEssay = entries.map(([slug, data]) => ({
      slug,
      sats: data.sats,
      payments: data.count,
      ...(btcPrice && { usd: satsToUsd(data.sats, btcPrice) }),
    }));
  }

  if (options.timeSeries) {
    const period = typeof options.timeSeries === 'string' ? options.timeSeries : 'monthly';
    const byPeriod = aggregateByPeriod(transactions, period);

    report.timeSeries = {
      period,
      data: [...byPeriod.entries()].map(([date, data]) => ({
        date,
        sats: data.sats,
        payments: data.count,
        ...(btcPrice && { usd: satsToUsd(data.sats, btcPrice) }),
      })),
    };
  }

  if (options.compare) {
    const period = typeof options.timeSeries === 'string' ? options.timeSeries : 'monthly';
    const byPeriod = aggregateByPeriod(transactions, period);
    const periods = [...byPeriod.entries()];

    if (periods.length >= 2) {
      const [currentKey, current] = periods[0];
      const [previousKey, previous] = periods[1];

      report.comparison = {
        current: { period: currentKey, sats: current.sats, payments: current.count },
        previous: { period: previousKey, sats: previous.sats, payments: previous.count },
        delta: {
          sats: current.sats - previous.sats,
          satsPercent: previous.sats > 0 ? ((current.sats - previous.sats) / previous.sats) * 100 : null,
          payments: current.count - previous.count,
          paymentsPercent: previous.count > 0 ? ((current.count - previous.count) / previous.count) * 100 : null,
        },
      };
    }
  }

  return report;
}
