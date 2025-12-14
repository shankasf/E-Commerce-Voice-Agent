/**
 * Dashboard Server - Express server for call metrics dashboard
 */

import express from 'express';
import { getCallMetrics, exportCallLogs, logsToCSV } from '../metrics/call-logs.js';

const router = express.Router();

// Basic auth middleware
const DASH_USER = process.env.DASH_USER || 'admin';
const DASH_PASS = process.env.DASH_PASS || 'kids4fun123';

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.split(' ')[1];

    if (!token) {
        res.set('WWW-Authenticate', 'Basic realm="Dashboard"');
        return res.status(401).send('Authentication required.');
    }

    const [user, pass] = Buffer.from(token, 'base64').toString().split(':');
    if (user === DASH_USER && pass === DASH_PASS) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Dashboard"');
    return res.status(401).send('Access denied.');
}

// Apply auth to all dashboard routes
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────

// Get metrics JSON
router.get('/api/metrics', async (req, res) => {
    try {
        const range = req.query.range || 'all';
        const metrics = await getCallMetrics(range);
        res.json(metrics);
    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export JSON
router.get('/export/json', async (req, res) => {
    try {
        const range = req.query.range || 'all';
        const logs = await exportCallLogs(range);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export CSV
router.get('/export/csv', async (req, res) => {
    try {
        const range = req.query.range || 'all';
        const logs = await exportCallLogs(range);
        const csv = logsToCSV(logs);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=call-logs-${range}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard HTML
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
    const range = req.query.range || '7d';

    try {
        const metrics = await getCallMetrics(range);
        res.send(renderDashboard(metrics, range));
    } catch (error) {
        res.status(500).send(`<h1>Error loading dashboard</h1><pre>${error.message}</pre>`);
    }
});

function renderDashboard(m, range) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playfunia Voice Agent Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 40px; }
    .header h1 { font-size: 24px; }
    .header .subtitle { opacity: 0.8; font-size: 14px; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .filters { display: flex; gap: 10px; margin-bottom: 20px; }
    .filters a { padding: 8px 16px; background: white; border-radius: 20px; text-decoration: none; color: #333; font-size: 14px; }
    .filters a.active { background: #667eea; color: white; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
    .card .value { font-size: 32px; font-weight: 600; color: #333; }
    .card .subvalue { font-size: 12px; color: #999; }
    .chart-container { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px; }
    .chart-container h3 { margin-bottom: 15px; font-size: 16px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
    .badge.positive { background: #d4edda; color: #155724; }
    .badge.negative { background: #f8d7da; color: #721c24; }
    .badge.neutral { background: #e2e3e5; color: #383d41; }
    .badge.hot { background: #ff6b6b; color: white; }
    .badge.warm { background: #ffd93d; color: #333; }
    .badge.cold { background: #74c0fc; color: white; }
    .export-links { margin-top: 20px; }
    .export-links a { color: #667eea; margin-right: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎈 Playfunia Voice Agent Dashboard</h1>
    <div class="subtitle">Kids4Fun Call Analytics & Metrics</div>
  </div>
  
  <div class="container">
    <div class="filters">
      <a href="?range=today" class="${range === 'today' ? 'active' : ''}">Today</a>
      <a href="?range=7d" class="${range === '7d' ? 'active' : ''}">7 Days</a>
      <a href="?range=30d" class="${range === '30d' ? 'active' : ''}">30 Days</a>
      <a href="?range=90d" class="${range === '90d' ? 'active' : ''}">90 Days</a>
      <a href="?range=all" class="${range === 'all' ? 'active' : ''}">All Time</a>
    </div>
    
    <div class="grid">
      <div class="card">
        <h3>📞 Total Calls</h3>
        <div class="value">${m.totalCalls}</div>
      </div>
      <div class="card">
        <h3>⏱️ Avg Duration</h3>
        <div class="value">${formatDuration(m.avgDuration)}</div>
      </div>
      <div class="card">
        <h3>⭐ Avg Lead Score</h3>
        <div class="value">${m.avgLeadScore}</div>
        <div class="subvalue">out of 100</div>
      </div>
      <div class="card">
        <h3>✅ Conversion Rate</h3>
        <div class="value">${m.conversionRate}%</div>
        <div class="subvalue">${m.conversions || 0} conversions</div>
      </div>
      <div class="card">
        <h3>📋 Follow-up Rate</h3>
        <div class="value">${m.followUpRate}%</div>
        <div class="subvalue">${m.followUps || 0} follow-ups needed</div>
      </div>
      <div class="card">
        <h3>⚠️ Escalation Rate</h3>
        <div class="value">${m.escalationRate}%</div>
        <div class="subvalue">${m.escalations || 0} escalated</div>
      </div>
    </div>
    
    <div class="two-col">
      <div class="chart-container">
        <h3>📊 Daily Call Volume</h3>
        <canvas id="volumeChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>😊 Sentiment Distribution</h3>
        <canvas id="sentimentChart"></canvas>
      </div>
    </div>
    
    <div class="two-col">
      <div class="chart-container">
        <h3>🕐 Hourly Distribution</h3>
        <canvas id="hourlyChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>🔥 Lead Score Bands</h3>
        <canvas id="leadChart"></canvas>
      </div>
    </div>
    
    <div class="chart-container">
      <h3>🛠️ Tool Usage</h3>
      <canvas id="toolChart"></canvas>
    </div>
    
    <div class="two-col">
      <div class="chart-container">
        <h3>📱 Top Callers</h3>
        <table>
          <thead><tr><th>Phone</th><th>Calls</th></tr></thead>
          <tbody>
            ${(m.topCallers || []).map(c => `<tr><td>${maskPhone(c.number)}</td><td>${c.count}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="chart-container">
        <h3>📝 Recent Calls</h3>
        <table>
          <thead><tr><th>From</th><th>Duration</th><th>Sentiment</th><th>Score</th></tr></thead>
          <tbody>
            ${(m.recentCalls || []).slice(0, 10).map(c => `
              <tr>
                <td>${maskPhone(c.fromNumber)}</td>
                <td>${formatDuration(c.duration)}</td>
                <td><span class="badge ${(c.sentiment || '').toLowerCase()}">${c.sentiment || 'N/A'}</span></td>
                <td>${c.leadScore || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="export-links">
      <a href="/dashboard/export/json?range=${range}">📥 Export JSON</a>
      <a href="/dashboard/export/csv?range=${range}">📥 Export CSV</a>
    </div>
  </div>
  
  <script>
    // Volume Chart
    new Chart(document.getElementById('volumeChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify((m.dailyVolume || []).map(d => d.date))},
        datasets: [{
          label: 'Calls',
          data: ${JSON.stringify((m.dailyVolume || []).map(d => d.count))},
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    
    // Sentiment Chart
    new Chart(document.getElementById('sentimentChart'), {
      type: 'doughnut',
      data: {
        labels: ['Positive', 'Neutral', 'Negative'],
        datasets: [{
          data: [${m.sentimentBreakdown.positive}, ${m.sentimentBreakdown.neutral}, ${m.sentimentBreakdown.negative}],
          backgroundColor: ['#28a745', '#6c757d', '#dc3545']
        }]
      },
      options: { responsive: true }
    });
    
    // Hourly Chart
    new Chart(document.getElementById('hourlyChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(Array.from({ length: 24 }, (_, i) => i + ':00'))},
        datasets: [{
          label: 'Calls',
          data: ${JSON.stringify(m.hourlyDistribution)},
          backgroundColor: '#764ba2'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    
    // Lead Score Chart
    new Chart(document.getElementById('leadChart'), {
      type: 'doughnut',
      data: {
        labels: ['Hot (70+)', 'Warm (40-69)', 'Cold (<40)'],
        datasets: [{
          data: [${m.leadBands?.hot || 0}, ${m.leadBands?.warm || 0}, ${m.leadBands?.cold || 0}],
          backgroundColor: ['#ff6b6b', '#ffd93d', '#74c0fc']
        }]
      },
      options: { responsive: true }
    });
    
    // Tool Usage Chart
    const toolLabels = ${JSON.stringify(Object.keys(m.toolUsage || {}))};
    const toolData = ${JSON.stringify(Object.values(m.toolUsage || {}))};
    new Chart(document.getElementById('toolChart'), {
      type: 'bar',
      data: {
        labels: toolLabels,
        datasets: [{
          label: 'Usage Count',
          data: toolData,
          backgroundColor: '#667eea'
        }]
      },
      options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
  </script>
</body>
</html>`;
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function maskPhone(phone) {
    if (!phone) return 'Unknown';
    if (phone.length > 6) {
        return phone.slice(0, 3) + '***' + phone.slice(-4);
    }
    return phone;
}

export default router;
