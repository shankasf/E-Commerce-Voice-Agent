/**
 * U Rack IT Dashboard - Main JavaScript
 * Handles navigation, data fetching, and chart rendering
 */

// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE = '/api/dashboard';
const REFRESH_INTERVAL = 30000; // 30 seconds

let currentPage = 'overview';
let currentDateRange = '7d';
let refreshTimer = null;
let charts = {};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSidebar();
    initDateRange();
    initRefresh();
    initExport();
    loadPage('overview');
});

// =====================================================
// NAVIGATION
// =====================================================

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                navigateTo(page);
            }
        });
    });

    // Handle browser back/forward
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.slice(1) || 'overview';
        if (page !== currentPage) {
            loadPage(page);
        }
    });
}

function navigateTo(page) {
    window.location.hash = page;
    loadPage(page);
}

function loadPage(page) {
    currentPage = page;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-primary-600', 'text-white');
        if (item.dataset.page === page) {
            item.classList.add('bg-primary-600', 'text-white');
        }
    });

    // Update header
    updatePageHeader(page);

    // Load page content
    showLoading();
    renderPage(page).then(() => {
        hideLoading();
    }).catch(err => {
        console.error('Error loading page:', err);
        hideLoading();
        showError('Failed to load page data');
    });
}

function updatePageHeader(page) {
    const titles = {
        overview: { title: 'Dashboard Overview', subtitle: 'Real-time analytics for your voice support system' },
        calls: { title: 'Call Metrics', subtitle: 'Comprehensive call analytics and performance data' },
        ai: { title: 'AI Performance', subtitle: 'AI agent resolution rates, response times, and agent distribution' },
        tickets: { title: 'Ticket Management', subtitle: 'Support ticket metrics, SLA compliance, and resolution times' },
        customers: { title: 'Customer Analytics', subtitle: 'Customer satisfaction, caller patterns, and organization insights' },
        system: { title: 'System Health', subtitle: 'Server performance, API latencies, and uptime monitoring' },
        costs: { title: 'Costs & ROI', subtitle: 'Token usage, API costs, and return on investment analysis' },
        trends: { title: 'Trends & Analytics', subtitle: 'Historical trends, sentiment analysis, and predictive insights' },
        settings: { title: 'Settings', subtitle: 'Dashboard configuration and preferences' }
    };

    const info = titles[page] || titles.overview;
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('pageSubtitle').textContent = info.subtitle;
}

// =====================================================
// SIDEBAR
// =====================================================

function initSidebar() {
    const toggle = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-collapsed');
        main.classList.toggle('main-expanded');
    });
}

// =====================================================
// DATE RANGE
// =====================================================

function initDateRange() {
    const select = document.getElementById('dateRange');
    select.addEventListener('change', (e) => {
        currentDateRange = e.target.value;
        loadPage(currentPage);
    });
}

// =====================================================
// REFRESH
// =====================================================

function initRefresh() {
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadPage(currentPage);
    });

    // Auto-refresh
    startAutoRefresh();
}

function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (currentPage === 'overview' || currentPage === 'system') {
            loadPage(currentPage);
        }
    }, REFRESH_INTERVAL);
}

// =====================================================
// EXPORT
// =====================================================

function initExport() {
    document.getElementById('exportBtn').addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE}/export/summary?range=${currentDateRange}`);
            const data = await response.json();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            showError('Export failed');
        }
    });
}

// =====================================================
// LOADING & ERRORS
// =====================================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingOverlay').classList.add('flex');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('loadingOverlay').classList.remove('flex');
}

function showError(message) {
    const container = document.getElementById('pageContent');
    container.innerHTML = `
        <div class="flex items-center justify-center h-64">
            <div class="text-center">
                <svg class="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-dark-300">${message}</p>
                <button onclick="loadPage('${currentPage}')" class="mt-4 px-4 py-2 bg-primary-600 rounded-lg hover:bg-primary-700">
                    Retry
                </button>
            </div>
        </div>
    `;
}

// =====================================================
// API CALLS
// =====================================================

async function fetchData(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.append('range', currentDateRange);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
}

// =====================================================
// PAGE RENDERING
// =====================================================

async function renderPage(page) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};

    const container = document.getElementById('pageContent');

    switch (page) {
        case 'overview':
            await renderOverviewPage(container);
            break;
        case 'calls':
            await renderCallsPage(container);
            break;
        case 'ai':
            await renderAIPage(container);
            break;
        case 'tickets':
            await renderTicketsPage(container);
            break;
        case 'customers':
            await renderCustomersPage(container);
            break;
        case 'system':
            await renderSystemPage(container);
            break;
        case 'costs':
            await renderCostsPage(container);
            break;
        case 'trends':
            await renderTrendsPage(container);
            break;
        case 'settings':
            renderSettingsPage(container);
            break;
        default:
            await renderOverviewPage(container);
    }
}

// =====================================================
// OVERVIEW PAGE
// =====================================================

async function renderOverviewPage(container) {
    // Fetch all data
    let data;
    try {
        data = await fetchData(`${API_BASE}/overview`);
    } catch {
        // Use mock data for demo
        data = getMockOverviewData();
    }

    const call = data.call_metrics || {};
    const ai = data.ai_metrics || {};
    const ticket = data.ticket_metrics || {};
    const system = data.system_metrics || {};
    const cost = data.cost_metrics || {};

    container.innerHTML = `
        <div class="fade-in space-y-6">
            <!-- Top Stats Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                ${renderMetricCard('Total Calls', call.total_calls_today || 0, 'phone', 'primary', '+12%')}
                ${renderMetricCard('AI Resolution', (ai.ai_resolution_rate_percent || 0) + '%', 'cpu', 'green', '+5%')}
                ${renderMetricCard('Avg Duration', formatDuration(call.avg_call_duration_seconds || 0), 'clock', 'blue')}
                ${renderMetricCard('Active Now', call.active_calls_now || 0, 'activity', 'yellow', null, true)}
                ${renderMetricCard('Open Tickets', ticket.open_tickets || 0, 'ticket', 'orange')}
                ${renderMetricCard('Uptime', (system.uptime_percent_24h || 99.9) + '%', 'server', 'green')}
            </div>
            
            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Hourly Calls Chart -->
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Calls by Hour</h3>
                    <div id="hourlyCallsChart" class="h-64"></div>
                </div>
                
                <!-- Agent Distribution -->
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Agent Distribution</h3>
                    <div id="agentDistChart" class="h-64"></div>
                </div>
            </div>
            
            <!-- Bottom Row -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Ticket Status -->
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Tickets by Priority</h3>
                    <div id="ticketPriorityChart" class="h-48"></div>
                </div>
                
                <!-- Cost Summary -->
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Cost Summary</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-dark-400">AI Tokens Used</span>
                            <span class="font-semibold">${formatNumber(cost.total_ai_tokens || 0)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-dark-400">AI Cost</span>
                            <span class="font-semibold text-primary-400">$${(cost.total_ai_cost_usd || 0).toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-dark-400">Twilio Minutes</span>
                            <span class="font-semibold">${(cost.total_twilio_minutes || 0).toFixed(1)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-dark-400">Twilio Cost</span>
                            <span class="font-semibold text-purple-400">$${(cost.total_twilio_cost_usd || 0).toFixed(2)}</span>
                        </div>
                        <div class="pt-4 border-t border-dark-700 flex justify-between items-center">
                            <span class="text-dark-300 font-medium">Total Cost</span>
                            <span class="text-xl font-bold text-white">$${(cost.total_cost_usd || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- System Health -->
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">System Health</h3>
                    <div class="space-y-4">
                        ${renderProgressBar('CPU', system.cpu_usage_percent || 0, 'primary')}
                        ${renderProgressBar('Memory', Math.round((system.memory_usage_mb || 0) / (system.memory_total_mb || 1) * 100), 'purple')}
                        ${renderProgressBar('Disk', system.disk_usage_percent || 0, 'blue')}
                        ${renderProgressBar('Sessions', Math.round((system.active_sessions || 0) / (system.max_sessions || 1) * 100), 'green')}
                    </div>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="glass rounded-2xl p-6">
                <h3 class="text-lg font-semibold mb-4">Recent Calls</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="text-left text-dark-400 text-sm">
                                <th class="pb-3">Caller</th>
                                <th class="pb-3">Status</th>
                                <th class="pb-3">Duration</th>
                                <th class="pb-3">Resolution</th>
                                <th class="pb-3">Time</th>
                            </tr>
                        </thead>
                        <tbody id="recentCallsTable" class="text-sm">
                            ${renderRecentCallsPlaceholder()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Render charts
    renderHourlyCallsChart(call.hourly_distribution || getMockHourlyData());
    renderAgentDistributionChart(ai.agent_distribution || getMockAgentData());
    renderTicketPriorityChart(ticket.open_by_priority || getMockPriorityData());
}

// =====================================================
// CALLS PAGE
// =====================================================

async function renderCallsPage(container) {
    let data;
    try {
        data = await fetchData(`${API_BASE}/calls`);
        data = data.metrics || data;
    } catch {
        data = getMockCallData();
    }

    container.innerHTML = `
        <div class="fade-in space-y-6">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                ${renderMetricCard('Total Calls', data.total_calls_today || 0, 'phone', 'primary')}
                ${renderMetricCard('Completed', data.completed_calls || 0, 'check', 'green')}
                ${renderMetricCard('Abandoned', data.abandoned_calls || 0, 'x', 'red')}
                ${renderMetricCard('Abandon Rate', (data.abandon_rate_percent || 0) + '%', 'trending-down', 'orange')}
                ${renderMetricCard('Avg Duration', formatDuration(data.avg_call_duration_seconds || 0), 'clock', 'blue')}
                ${renderMetricCard('Avg Wait', formatDuration(data.avg_wait_time_seconds || 0), 'hourglass', 'purple')}
            </div>
            
            <!-- Duration Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${renderStatCard('Longest Call', formatDuration(data.max_call_duration_seconds || 0), 'Recorded today')}
                ${renderStatCard('Shortest Call', formatDuration(data.min_call_duration_seconds || 0), 'Non-abandoned')}
                ${renderStatCard('Unique Callers', data.unique_callers || 0, 'Distinct phone numbers')}
            </div>
            
            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Calls by Hour</h3>
                    <div id="callsHourlyChart" class="h-72"></div>
                </div>
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Calls by Day of Week</h3>
                    <div id="callsDayChart" class="h-72"></div>
                </div>
            </div>
            
            <!-- Direction Breakdown -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Call Direction</h3>
                    <div id="callDirectionChart" class="h-64"></div>
                </div>
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Peak Hours Analysis</h3>
                    <div class="space-y-3">
                        ${(data.peak_hours || []).map((h, i) => `
                            <div class="flex items-center gap-4 p-3 bg-dark-800 rounded-lg">
                                <span class="text-2xl font-bold text-primary-400">#${i + 1}</span>
                                <div>
                                    <p class="font-medium">${formatHour(h.hour)}</p>
                                    <p class="text-sm text-dark-400">${h.call_count} calls</p>
                                </div>
                            </div>
                        `).join('') || '<p class="text-dark-400">No data available</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    renderCallsHourlyChart(data.hourly_distribution || getMockHourlyData());
    renderCallsDayChart(data.day_of_week_distribution || getMockDayData());
    renderCallDirectionChart(data.inbound_calls || 0, data.outbound_calls || 0);
}

// =====================================================
// AI PERFORMANCE PAGE
// =====================================================

async function renderAIPage(container) {
    let data;
    try {
        data = await fetchData(`${API_BASE}/ai-performance`);
        data = data.metrics || data;
    } catch {
        data = getMockAIData();
    }

    container.innerHTML = `
        <div class="fade-in space-y-6">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                ${renderMetricCard('AI Resolution Rate', (data.ai_resolution_rate_percent || 0) + '%', 'cpu', 'green')}
                ${renderMetricCard('AI Resolved', data.ai_resolved_calls || 0, 'check-circle', 'primary')}
                ${renderMetricCard('Escalated', data.escalated_calls || 0, 'arrow-up', 'orange')}
                ${renderMetricCard('Escalation Rate', (data.escalation_rate_percent || 0) + '%', 'alert-triangle', 'red')}
                ${renderMetricCard('Avg Response', data.avg_ai_response_time_ms + 'ms', 'zap', 'blue')}
                ${renderMetricCard('Confidence', ((data.avg_confidence_score || 0) * 100).toFixed(1) + '%', 'target', 'purple')}
            </div>
            
            <!-- Additional Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                ${renderStatCard('Total Interactions', data.total_interactions || 0, 'Agent conversations')}
                ${renderStatCard('Avg Turns/Call', (data.avg_turns_per_call || 0).toFixed(1), 'Back and forth')}
                ${renderStatCard('Tool Calls', data.total_tool_calls || 0, 'Function invocations')}
                ${renderStatCard('Fallbacks', data.fallback_responses || 0, 'Could not understand')}
            </div>
            
            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Agent Distribution</h3>
                    <div id="aiAgentChart" class="h-72"></div>
                </div>
                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-semibold mb-4">Resolution vs Escalation</h3>
                    <div id="aiResolutionChart" class="h-72"></div>
                </div>
            </div>
            
            <!-- Agent Table -->
            <div class="glass rounded-2xl p-6">
                <h3 class="text-lg font-semibold mb-4">Agent Performance Details</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="text-left text-dark-400 text-sm border-b border-dark-700">
                                <th class="pb-3 pr-4">Agent</th>
                                <th class="pb-3 pr-4">Usage</th>
                                <th class="pb-3 pr-4">%</th>
                                <th class="pb-3 pr-4">Avg Response</th>
                                <th class="pb-3 pr-4">Tool Calls</th>
                                <th class="pb-3">Handoffs</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            ${(data.agent_distribution || []).map(a => `
                                <tr class="border-b border-dark-800">
                                    <td class="py-3 pr-4">
                                        <span class="px-2 py-1 bg-primary-600/20 text-primary-400 rounded text-xs font-medium">
                                            ${formatAgentName(a.agent_type)}
                                        </span>
                                    </td>
                                    <td class="py-3 pr-4 font-medium">${a.usage_count}</td>
                                    <td class="py-3 pr-4">${a.percentage}%</td>
                                    <td class="py-3 pr-4">${a.avg_duration_ms}ms</td>
                                    <td class="py-3 pr-4">${a.tool_calls || 0}</td>
                                    <td class="py-3">${a.handoffs || 0}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="6" class="py-4 text-dark-400 text-center">No data available</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    renderAIAgentChart(data.agent_distribution || getMockAgentData());
    renderAIResolutionChart(data.ai_resolved_calls || 0, (data.ai_resolved_calls || 0) + (data.escalated_calls || 0));
}

// =====================================================
// HELPER FUNCTIONS (LOCAL)
// =====================================================

function renderRecentCallsPlaceholder() {
    return Array.from({ length: 5 }).map(() => `
        <tr class="border-b border-dark-800">
            <td class="py-3 pr-4 text-dark-400">Loading...</td>
            <td class="py-3 pr-4"><span class="px-2 py-1 bg-dark-700 rounded text-xs">--</span></td>
            <td class="py-3 pr-4">--</td>
            <td class="py-3 pr-4">--</td>
            <td class="py-3 text-dark-400">--</td>
        </tr>
    `).join('');
}

function renderProgressBar(label, value, color) {
    const colors = {
        primary: 'bg-primary-600',
        purple: 'bg-purple-600',
        blue: 'bg-blue-600',
        green: 'bg-green-600'
    };

    return `
        <div>
            <div class="flex justify-between text-sm mb-1">
                <span class="text-dark-400">${label}</span>
                <span>${value}%</span>
            </div>
            <div class="w-full bg-dark-700 rounded-full h-2">
                <div class="${colors[color] || colors.primary} h-2 rounded-full" style="width: ${Math.min(value, 100)}%"></div>
            </div>
        </div>
    `;
}

function renderTicketPriorityChart(data) {
    if (!data || data.length === 0) data = getMockPriorityData();

    const labels = data.map(d => d.priority);
    const values = data.map(d => d.count);

    new ApexCharts(document.querySelector("#ticketPriorityChart"), {
        chart: { type: 'bar', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [{ name: 'Tickets', data: values }],
        xaxis: { categories: labels },
        colors: ['#f59e0b'],
        plotOptions: { bar: { borderRadius: 4 } },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderCallsDayChart(data) {
    if (!data || data.length === 0) data = getMockDayData();

    const labels = data.map(d => d.day);
    const values = data.map(d => d.call_count);

    new ApexCharts(document.querySelector("#callsDayChart"), {
        chart: { type: 'bar', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [{ name: 'Calls', data: values }],
        xaxis: { categories: labels },
        colors: ['#8b5cf6'],
        plotOptions: { bar: { borderRadius: 4 } },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function getMockHourlyData() {
    return Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        call_count: Math.floor(Math.random() * 15) + 2,
        avg_duration: Math.floor(Math.random() * 300) + 60
    }));
}

function getMockDayData() {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day: day,
        call_count: Math.floor(Math.random() * 50) + 20
    }));
}

function getMockAgentData() {
    return [
        { agent_type: 'triage_agent', count: 156 },
        { agent_type: 'ticket_agent', count: 98 },
        { agent_type: 'network_agent', count: 76 },
        { agent_type: 'device_agent', count: 58 },
        { agent_type: 'email_agent', count: 42 },
        { agent_type: 'printer_agent', count: 26 }
    ];
}
