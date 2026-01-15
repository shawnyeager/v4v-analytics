/**
 * JSON Formatter
 * Build JSON report for CLI output
 */

import { satsToUsd } from '../price.js';
import { buildSummary, aggregateByEssay, aggregateByPeriod } from '../transformers.js';

/**
 * Build JSON report from transactions
 */
export function buildJsonReport(transactions, options, btcPrice) {
  const summary = buildSummary(transactions, btcPrice);

  const report = {
    summary: {
      totalSats: summary.totalSats,
      totalPayments: summary.totalPayments,
      averageSats: summary.avgSats,
      essays: { sats: summary.essays.sats, payments: summary.essays.payments },
      general: { sats: summary.general.sats, payments: summary.general.payments },
      period: {
        from: options.fromDate?.toISOString().split('T')[0] || null,
        to: options.toDate?.toISOString().split('T')[0] || null,
      },
    },
  };

  if (btcPrice) {
    report.summary.btcPrice = btcPrice;
    report.summary.totalUsd = summary.totalUsd;
    report.summary.essays.usd = summary.essays.usd;
    report.summary.general.usd = summary.general.usd;
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
