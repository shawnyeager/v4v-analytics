/**
 * V4V Dashboard Frontend
 */

// Constants
const MILLISATS_PER_SAT = 1000;
const SATS_PER_BTC = 100_000_000;
const MAX_WEEKS_FOR_ALL_TIME = 52;
const FOOTER_SLUG = '(footer/general)';

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
  sourceTableBody: document.getElementById('table-body'),
  chartSkeleton: document.getElementById('chart-skeleton'),
  chartCanvas: document.getElementById('trend-chart'),
  drillDown: document.getElementById('drill-down'),
  drillDownTitle: document.getElementById('drill-down-title'),
  drillDownContent: document.getElementById('drill-down-content'),
  drillDownClose: document.getElementById('drill-down-close'),
  lastRefresh: document.getElementById('last-refresh'),
  refreshBtn: document.getElementById('refresh-btn'),
};

// ============================================
// URL State Management
// ============================================

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  
  const range = params.get('range');
  if (range && ['7', '30', '90', '365', 'all'].includes(range)) {
    selectedRange = range;
  }
  
  const sort = params.get('sort');
  if (sort && ['slug', 'sats', 'count', 'lastPayment'].includes(sort)) {
    sortColumn = sort;
  }
  
  const dir = params.get('dir');
  if (dir && ['asc', 'desc'].includes(dir)) {
    sortDirection = dir;
  }
  
  // Update UI to match state
  document.querySelectorAll('.time-controls button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.range === selectedRange);
  });
}

function updateUrlState() {
  const params = new URLSearchParams();
  
  if (selectedRange !== '30') {
    params.set('range', selectedRange);
  }
  if (sortColumn !== 'sats') {
    params.set('sort', sortColumn);
  }
  if (sortDirection !== 'desc') {
    params.set('dir', sortDirection);
  }
  
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  
  history.replaceState(null, '', newUrl);
}

// ============================================
// Utility Functions
// ============================================

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
  if (slug === FOOTER_SLUG) return 'Footer';
  if (!data?.essayTitles) return slug;
  return data.essayTitles[slug] || data.essayTitles[`essays/${slug}`] || slug;
}

// ============================================
// Data Processing
// ============================================

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

function calculateSummary(transactions, btcPrice) {
  const generalTxs = transactions.filter((tx) => tx.essay === FOOTER_SLUG);

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
    totalUsd: btcPrice ? (totalSats / SATS_PER_BTC) * btcPrice : null,
    avgUsd: btcPrice ? (avgSats / SATS_PER_BTC) * btcPrice : null,
    generalSats,
    generalCount: generalTxs.length,
    generalLastPayment,
  };
}

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

function aggregateByWeek(transactions, range) {
  const byWeek = new Map();

  const now = new Date();
  const currentDay = now.getDay();
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
  currentMonday.setHours(0, 0, 0, 0);

  let numWeeks;
  if (range === 'all') {
    numWeeks = MAX_WEEKS_FOR_ALL_TIME;
  } else {
    const days = parseInt(range, 10);
    numWeeks = Math.ceil(days / 7);
  }

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - i * 7);
    const key = weekStart.toISOString().split('T')[0];
    byWeek.set(key, { sats: 0, count: 0 });
  }

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

  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, d]) => ({ week, sats: d.sats, count: d.count }));
}

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

// ============================================
// UI Updates
// ============================================

function updateSummary(summary, btcPrice) {
  elements.totalSats.textContent = `${formatNumber(summary.totalSats)} sats`;
  elements.totalUsd.textContent = summary.totalUsd ? formatUsd(summary.totalUsd) : '';
  elements.totalPayments.textContent = formatNumber(summary.totalPayments);
  elements.avgSats.textContent = `${formatNumber(summary.avgSats)} sats`;
  elements.avgUsd.textContent = summary.avgUsd ? formatUsd(summary.avgUsd) : '';
  elements.btcPrice.textContent = btcPrice ? `$${formatNumber(btcPrice)}` : 'N/A';
}

function updateChart(weeklyData) {
  // Hide skeleton, show canvas
  elements.chartSkeleton.style.display = 'none';
  elements.chartCanvas.style.display = 'block';
  
  const ctx = elements.chartCanvas.getContext('2d');
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
            ticks: { color: '#a0a0a0', maxRotation: 45 },
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

function updateDrillDown(slug, transactions) {
  const filtered = transactions.filter((tx) => tx.essay === slug);

  elements.drillDownTitle.textContent = slug === FOOTER_SLUG ? 'Footer' : getSourceName(slug);
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

function closeDrillDown() {
  elements.drillDown.classList.remove('open');
  selectedEssay = null;
  document.querySelectorAll('#source-table tbody tr').forEach((tr) => {
    tr.classList.remove('selected');
  });
}

// ============================================
// Main Render
// ============================================

function render() {
  if (!data) return;

  const filteredTx = filterByRange(data.transactions, selectedRange);
  const summary = calculateSummary(filteredTx, data.btcPrice);
  updateSummary(summary, data.btcPrice);

  const weeklyData = aggregateByWeek(filteredTx, selectedRange);
  const sourceData = aggregateBySource(filteredTx);

  updateChart(weeklyData);
  updateTable(sourceData);

  if (selectedEssay) {
    updateDrillDown(selectedEssay, filteredTx);
  }
  
  // Update URL with current state
  updateUrlState();
}

// ============================================
// Data Fetching
// ============================================

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

// ============================================
// Event Listeners
// ============================================

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
  if (!row || !row.dataset.slug) return;

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

// Handle browser back/forward
window.addEventListener('popstate', () => {
  readUrlState();
  if (data) render();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDrillDown();
  }
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
    fetchData();
  }
});

// ============================================
// Initialization
// ============================================

readUrlState();
fetchData();
