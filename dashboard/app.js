/**
 * V4V Dashboard Frontend
 */

// State
let data = null;
let chart = null;
let selectedRange = '30';
let sortColumn = 'sats';
let sortDirection = 'desc';
let selectedEssay = null;

// DOM elements
const elements = {
  totalSats: document.getElementById('total-sats'),
  totalUsd: document.getElementById('total-usd'),
  totalPayments: document.getElementById('total-payments'),
  avgSats: document.getElementById('avg-sats'),
  avgUsd: document.getElementById('avg-usd'),
  btcPrice: document.getElementById('btc-price'),
  sourceTableBody: document.querySelector('#source-table tbody'),
  drillDown: document.getElementById('drill-down'),
  drillDownTitle: document.getElementById('drill-down-title'),
  drillDownContent: document.getElementById('drill-down-content'),
  drillDownClose: document.getElementById('drill-down-close'),
  lastRefresh: document.getElementById('last-refresh'),
  refreshBtn: document.getElementById('refresh-btn'),
};

// Utility functions
function formatNumber(num) {
  return num.toLocaleString();
}

function formatUsd(usd) {
  if (usd === null || usd === undefined) return '';
  return `~$${usd.toFixed(2)}`;
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString();
}

function formatDateTime(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

function getSourceName(slug) {
  if (slug === '(footer/general)') return 'Footer';
  if (!data?.essayTitles) return slug;
  return data.essayTitles[slug] || slug;
}

// Filter transactions by date range
function filterByRange(transactions, range) {
  if (range === 'all') return transactions;

  const now = Date.now();
  const days = parseInt(range, 10);
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  return transactions.filter((tx) => {
    const timestamp = tx.timestamp * 1000;
    return timestamp >= cutoff;
  });
}

// Recalculate summary for filtered transactions
function calculateSummary(transactions, btcPrice) {
  const generalTxs = transactions.filter((tx) => tx.essay === '(footer/general)');

  const totalSats = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalPayments = transactions.length;
  const avgSats = totalPayments > 0 ? Math.round(totalSats / totalPayments) : 0;
  const generalSats = generalTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const generalLastPayment = generalTxs.length > 0
    ? Math.max(...generalTxs.map((tx) => tx.timestamp))
    : null;

  return {
    totalSats,
    totalPayments,
    avgSats,
    totalUsd: btcPrice ? (totalSats / 100_000_000) * btcPrice : null,
    avgUsd: btcPrice ? (avgSats / 100_000_000) * btcPrice : null,
    generalSats,
    generalCount: generalTxs.length,
    generalLastPayment,
  };
}

// Aggregate transactions by source (essays + footer)
function aggregateBySource(transactions) {
  const bySource = new Map();

  for (const tx of transactions) {
    const slug = tx.essay;
    const existing = bySource.get(slug) || { sats: 0, count: 0, lastPayment: 0 };
    existing.sats += tx.amount;
    existing.count += 1;
    if (tx.timestamp > existing.lastPayment) {
      existing.lastPayment = tx.timestamp;
    }
    bySource.set(slug, existing);
  }

  return [...bySource.entries()].map(([slug, d]) => ({
    slug,
    sats: d.sats,
    count: d.count,
    lastPayment: d.lastPayment,
  }));
}

// Aggregate transactions by week (fills in gaps with zeros)
function aggregateByWeek(transactions, range) {
  const byWeek = new Map();

  // Get Monday of current week
  const now = new Date();
  const currentDay = now.getDay();
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
  currentMonday.setHours(0, 0, 0, 0);

  // Determine number of weeks based on range
  let numWeeks;
  if (range === 'all') {
    numWeeks = 52; // Show up to a year for "all"
  } else {
    const days = parseInt(range, 10);
    numWeeks = Math.ceil(days / 7);
  }

  // Create weeks with zero values
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - i * 7);
    const key = weekStart.toISOString().split('T')[0];
    byWeek.set(key, { sats: 0, count: 0 });
  }

  // Add transaction data
  for (const tx of transactions) {
    if (!tx.timestamp) continue;
    const date = new Date(tx.timestamp * 1000);
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().split('T')[0];

    if (byWeek.has(key)) {
      const existing = byWeek.get(key);
      existing.sats += tx.amount;
      existing.count += 1;
    }
  }

  // Sort by date ascending
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, d]) => ({ week, sats: d.sats, count: d.count }));
}

// Sort source data
function sortSourceData(sourceData) {
  const sorted = [...sourceData];
  sorted.sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    if (sortColumn === 'slug') {
      aVal = getSourceName(aVal).toLowerCase();
      bVal = getSourceName(bVal).toLowerCase();
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });
  return sorted;
}

// Update summary cards
function updateSummary(summary, btcPrice) {
  elements.totalSats.textContent = `${formatNumber(summary.totalSats)} sats`;
  elements.totalUsd.textContent = summary.totalUsd ? formatUsd(summary.totalUsd) : '';
  elements.totalPayments.textContent = formatNumber(summary.totalPayments);
  elements.avgSats.textContent = `${formatNumber(summary.avgSats)} sats`;
  elements.avgUsd.textContent = summary.avgUsd ? formatUsd(summary.avgUsd) : '';
  elements.btcPrice.textContent = btcPrice ? `$${formatNumber(btcPrice)}` : 'N/A';
}

// Update chart
function updateChart(weeklyData) {
  const ctx = document.getElementById('trend-chart').getContext('2d');

  const labels = weeklyData.map((d) => d.week);
  const values = weeklyData.map((d) => d.sats);

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Sats',
            data: values,
            borderColor: '#ff6b35',
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#242424',
            borderColor: '#3a3a3a',
            borderWidth: 1,
            titleColor: '#f5f5f5',
            bodyColor: '#a0a0a0',
            callbacks: {
              label: (context) => `${formatNumber(context.raw)} sats`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#3a3a3a' },
            ticks: { color: '#a0a0a0' },
          },
          y: {
            grid: { color: '#3a3a3a' },
            ticks: {
              color: '#a0a0a0',
              callback: (value) => formatNumber(value),
            },
          },
        },
      },
    });
  }
}

// Update source table
function updateTable(sourceData) {
  const sorted = sortSourceData(sourceData);

  elements.sourceTableBody.innerHTML = sorted
    .map(
      (d) => `
      <tr data-slug="${d.slug}" class="${selectedEssay === d.slug ? 'selected' : ''}">
        <td>${getSourceName(d.slug)}</td>
        <td>${formatNumber(d.sats)}</td>
        <td>${d.count}</td>
        <td>${formatDate(d.lastPayment)}</td>
      </tr>
    `
    )
    .join('');

  // Update sort indicators
  document.querySelectorAll('#source-table th').forEach((th) => {
    const col = th.dataset.sort;
    th.classList.remove('sorted', 'asc', 'desc');
    if (col === sortColumn) {
      th.classList.add('sorted', sortDirection);
    }
  });
}

// Update drill-down panel
function updateDrillDown(slug, transactions) {
  const filtered = transactions.filter((tx) => tx.essay === slug);

  elements.drillDownTitle.textContent = getSourceName(slug);
  elements.drillDownContent.innerHTML = filtered
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(
      (tx) => `
      <div class="transaction-item">
        <div class="transaction-amount">${formatNumber(tx.amount)} sats</div>
        <div class="transaction-date">${formatDateTime(tx.timestamp)}</div>
      </div>
    `
    )
    .join('');

  elements.drillDown.classList.add('open');
}

// Close drill-down
function closeDrillDown() {
  elements.drillDown.classList.remove('open');
  selectedEssay = null;
  document.querySelectorAll('#source-table tbody tr').forEach((tr) => {
    tr.classList.remove('selected');
  });
}

// Render all data
function render() {
  if (!data) return;

  // Filter transactions by selected range
  const filteredTx = filterByRange(data.transactions, selectedRange);

  // Calculate summary for filtered data
  const summary = calculateSummary(filteredTx, data.btcPrice);
  updateSummary(summary, data.btcPrice);

  // Aggregate by week and source
  const weeklyData = aggregateByWeek(filteredTx, selectedRange);
  const sourceData = aggregateBySource(filteredTx);

  updateChart(weeklyData);
  updateTable(sourceData);

  // Update drill-down if open
  if (selectedEssay) {
    updateDrillDown(selectedEssay, filteredTx);
  }
}

// Fetch data from API
async function fetchData() {
  elements.refreshBtn.disabled = true;
  document.body.classList.add('loading');

  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    data = await response.json();
    render();
    elements.lastRefresh.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error('Error fetching data:', error);
    elements.lastRefresh.textContent = `Error: ${error.message}`;
  } finally {
    elements.refreshBtn.disabled = false;
    document.body.classList.remove('loading');
  }
}

// Event listeners
document.querySelectorAll('.time-controls button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.time-controls button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRange = btn.dataset.range;
    render();
  });
});

document.querySelectorAll('#source-table th').forEach((th) => {
  th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (col === sortColumn) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = col;
      sortDirection = 'desc';
    }
    render();
  });
});

elements.sourceTableBody.addEventListener('click', (e) => {
  const row = e.target.closest('tr');
  if (!row) return;

  const slug = row.dataset.slug;
  if (selectedEssay === slug) {
    closeDrillDown();
  } else {
    selectedEssay = slug;
    render();
    updateDrillDown(slug, filterByRange(data.transactions, selectedRange));
  }
});

elements.drillDownClose.addEventListener('click', closeDrillDown);

elements.refreshBtn.addEventListener('click', fetchData);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDrillDown();
  }
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
    fetchData();
  }
});

// Initial load
fetchData();
