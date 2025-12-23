/**
 * U Rack IT Dashboard - Part 3
 * Chart rendering functions and utilities
 */

// =====================================================
// CHART RENDERING FUNCTIONS
// =====================================================

function renderHourlyCallsChart(data) {
    const hours = data.map(d => formatHour(d.hour));
    const counts = data.map(d => d.call_count);

    new ApexCharts(document.querySelector("#hourlyCallsChart"), {
        chart: { type: 'area', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [{ name: 'Calls', data: counts }],
        xaxis: { categories: hours },
        colors: ['#06b6d4'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
        stroke: { curve: 'smooth', width: 2 },
        dataLabels: { enabled: false },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderAgentDistributionChart(data) {
    const labels = data.map(d => d.agent_type);
    const values = data.map(d => d.count);

    new ApexCharts(document.querySelector("#agentDistChart"), {
        chart: { type: 'donut', height: '100%', background: 'transparent' },
        series: values,
        labels: labels,
        colors: ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'],
        legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
        plotOptions: { pie: { donut: { size: '65%' } } },
        dataLabels: { enabled: true, style: { colors: ['#fff'] } },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderCallsHourlyChart(data) {
    const hours = data.map(d => formatHour(d.hour));
    const counts = data.map(d => d.call_count);
    const durations = data.map(d => d.avg_duration);

    new ApexCharts(document.querySelector("#callsHourlyChart"), {
        chart: { type: 'line', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [
            { name: 'Calls', type: 'column', data: counts },
            { name: 'Avg Duration (s)', type: 'line', data: durations }
        ],
        xaxis: { categories: hours },
        yaxis: [
            { title: { text: 'Calls' } },
            { opposite: true, title: { text: 'Duration' } }
        ],
        colors: ['#06b6d4', '#f59e0b'],
        stroke: { width: [0, 3], curve: 'smooth' },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderCallDirectionChart(inbound, outbound) {
    new ApexCharts(document.querySelector("#callDirectionChart"), {
        chart: { type: 'pie', height: '100%', background: 'transparent' },
        series: [inbound, outbound],
        labels: ['Inbound', 'Outbound'],
        colors: ['#06b6d4', '#8b5cf6'],
        legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderCallStatusChart(completed, answered, voicemail, no_answer) {
    new ApexCharts(document.querySelector("#callStatusChart"), {
        chart: { type: 'donut', height: '100%', background: 'transparent' },
        series: [completed, answered, voicemail, no_answer],
        labels: ['Completed', 'Answered', 'Voicemail', 'No Answer'],
        colors: ['#10b981', '#06b6d4', '#f59e0b', '#ef4444'],
        legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
        plotOptions: { pie: { donut: { size: '60%' } } },
        theme: { mode: 'dark' }
    }).render();
}

function renderAIAgentChart(data) {
    if (!data || data.length === 0) data = getMockAgentUsage();

    const labels = data.map(d => formatAgentName(d.agent_type));
    const values = data.map(d => d.count);

    new ApexCharts(document.querySelector("#aiAgentChart"), {
        chart: { type: 'bar', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [{ name: 'Interactions', data: values }],
        xaxis: { categories: labels },
        colors: ['#8b5cf6'],
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderAIResolutionChart(resolved, total) {
    const unresolved = total - resolved;

    new ApexCharts(document.querySelector("#aiResolutionChart"), {
        chart: { type: 'radialBar', height: '100%', background: 'transparent' },
        series: [Math.round((resolved / total) * 100) || 0],
        labels: ['Resolution Rate'],
        colors: ['#10b981'],
        plotOptions: {
            radialBar: {
                hollow: { size: '70%' },
                dataLabels: {
                    name: { fontSize: '16px', color: '#9ca3af' },
                    value: { fontSize: '24px', color: '#fff' }
                }
            }
        },
        theme: { mode: 'dark' }
    }).render();
}

function renderTicketsByPriorityChart(data) {
    if (!data || data.length === 0) data = getMockPriorityData();

    const labels = data.map(d => d.priority);
    const values = data.map(d => d.count);

    new ApexCharts(document.querySelector("#ticketsByPriorityChart"), {
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

function renderOpenTicketsChart(data) {
    if (!data || data.length === 0) data = getMockPriorityData();

    const labels = data.map(d => d.priority);
    const values = data.map(d => d.count);

    new ApexCharts(document.querySelector("#openTicketsChart"), {
        chart: { type: 'donut', height: '100%', background: 'transparent' },
        series: values,
        labels: labels,
        colors: ['#ef4444', '#f59e0b', '#fbbf24', '#10b981'],
        legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
        theme: { mode: 'dark' }
    }).render();
}

function renderCSATChart(data) {
    const labels = ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'];
    const values = [0, 0, 0, 0, 0];

    data.forEach(d => {
        if (d.score >= 1 && d.score <= 5) values[d.score - 1] = d.count;
    });

    new ApexCharts(document.querySelector("#csatChart"), {
        chart: { type: 'bar', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [{ name: 'Ratings', data: values }],
        xaxis: { categories: labels },
        colors: ['#fbbf24'],
        plotOptions: { bar: { borderRadius: 4 } },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderCallerTypeChart(newCallers, repeatCallers) {
    new ApexCharts(document.querySelector("#callerTypeChart"), {
        chart: { type: 'pie', height: '100%', background: 'transparent' },
        series: [newCallers, repeatCallers],
        labels: ['New Callers', 'Repeat Callers'],
        colors: ['#10b981', '#8b5cf6'],
        legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
        theme: { mode: 'dark' }
    }).render();
}

function renderOrgCallsChart(data) {
    if (!data || data.length === 0) {
        document.querySelector("#orgCallsChart").innerHTML = '<p class="text-center text-dark-400 py-8">No data available</p>';
        return;
    }

    const labels = data.map(d => d.organization);
    const values = data.map(d => d.call_count);

    new ApexCharts(document.querySelector("#orgCallsChart"), {
        chart: { type: 'bar', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [{ name: 'Calls', data: values }],
        xaxis: { categories: labels },
        colors: ['#06b6d4'],
        plotOptions: { bar: { borderRadius: 4 } },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderCostDistributionChart(aiCost, twilioCost) {
    new ApexCharts(document.querySelector("#costDistChart"), {
        chart: { type: 'pie', height: '100%', background: 'transparent' },
        series: [aiCost, twilioCost],
        labels: ['AI (OpenAI)', 'Twilio'],
        colors: ['#8b5cf6', '#06b6d4'],
        legend: { position: 'bottom', labels: { colors: '#9ca3af' } },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark', y: { formatter: (val) => '$' + val.toFixed(2) } }
    }).render();
}

function renderDailyTrendChart(data) {
    if (!data || data.length === 0) {
        document.querySelector("#dailyTrendChart").innerHTML = '<p class="text-center text-dark-400 py-8">No data available</p>';
        return;
    }

    const dates = data.map(d => d.date);
    const calls = data.map(d => d.total_calls);
    const resolved = data.map(d => d.resolved_calls);

    new ApexCharts(document.querySelector("#dailyTrendChart"), {
        chart: { type: 'area', height: '100%', toolbar: { show: false }, background: 'transparent' },
        series: [
            { name: 'Total Calls', data: calls },
            { name: 'Resolved', data: resolved }
        ],
        xaxis: { categories: dates, type: 'datetime' },
        colors: ['#06b6d4', '#10b981'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
        stroke: { curve: 'smooth', width: 2 },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

function renderSentimentChart(data) {
    if (!data || data.length === 0) {
        document.querySelector("#sentimentChart").innerHTML = '<p class="text-center text-dark-400 py-8">No data available</p>';
        return;
    }

    const dates = data.map(d => d.date);
    const positive = data.map(d => d.positive || 0);
    const neutral = data.map(d => d.neutral || 0);
    const negative = data.map(d => d.negative || 0);

    new ApexCharts(document.querySelector("#sentimentChart"), {
        chart: { type: 'area', height: '100%', stacked: true, toolbar: { show: false }, background: 'transparent' },
        series: [
            { name: 'Positive', data: positive },
            { name: 'Neutral', data: neutral },
            { name: 'Negative', data: negative }
        ],
        xaxis: { categories: dates, type: 'datetime' },
        colors: ['#10b981', '#6b7280', '#ef4444'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.2 } },
        stroke: { curve: 'smooth', width: 0 },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' },
        tooltip: { theme: 'dark' }
    }).render();
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatDuration(seconds) {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return hour + ' AM';
    return (hour - 12) + ' PM';
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

function formatAgentName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function maskPhone(phone) {
    if (!phone || phone.length < 4) return phone || '';
    return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
}

function getPriorityBadge(priority) {
    const badges = {
        'Critical': 'px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs',
        'High': 'px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs',
        'Medium': 'px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs',
        'Low': 'px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs'
    };
    return badges[priority] || badges['Medium'];
}

function getPriorityColor(priority) {
    const colors = {
        'Critical': 'bg-red-500',
        'High': 'bg-orange-500',
        'Medium': 'bg-yellow-500',
        'Low': 'bg-green-500'
    };
    return colors[priority] || colors['Medium'];
}

// =====================================================
// RENDER COMPONENT FUNCTIONS
// =====================================================

function renderMetricCard(label, value, icon, color) {
    const colors = {
        primary: 'bg-primary-600/20 text-primary-400',
        blue: 'bg-blue-600/20 text-blue-400',
        green: 'bg-green-600/20 text-green-400',
        yellow: 'bg-yellow-600/20 text-yellow-400',
        orange: 'bg-orange-600/20 text-orange-400',
        red: 'bg-red-600/20 text-red-400',
        purple: 'bg-purple-600/20 text-purple-400'
    };

    return `
        <div class="glass rounded-xl p-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 ${colors[color] || colors.primary} rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                </div>
                <div>
                    <p class="text-dark-400 text-sm">${label}</p>
                    <p class="text-xl font-bold">${value}</p>
                </div>
            </div>
        </div>
    `;
}

function renderStatCard(label, value, subtitle, color = 'primary') {
    const colors = {
        primary: 'text-primary-400',
        green: 'text-green-400',
        yellow: 'text-yellow-400',
        red: 'text-red-400'
    };

    return `
        <div class="glass rounded-xl p-4 text-center">
            <p class="text-3xl font-bold ${colors[color] || colors.primary}">${value}</p>
            <p class="font-medium mt-1">${label}</p>
            <p class="text-sm text-dark-400">${subtitle}</p>
        </div>
    `;
}

function renderGaugeCard(label, value, unit, color, subtitle = '') {
    const colors = {
        primary: { bg: 'bg-primary-600', ring: 'ring-primary-600/30' },
        purple: { bg: 'bg-purple-600', ring: 'ring-purple-600/30' },
        blue: { bg: 'bg-blue-600', ring: 'ring-blue-600/30' },
        green: { bg: 'bg-green-600', ring: 'ring-green-600/30' }
    };
    const c = colors[color] || colors.primary;
    const percent = Math.min(value, 100);

    return `
        <div class="glass rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <span class="font-medium">${label}</span>
                <span class="text-sm text-dark-400">${value}${unit}</span>
            </div>
            <div class="w-full bg-dark-700 rounded-full h-3">
                <div class="${c.bg} h-3 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
            </div>
            ${subtitle ? `<p class="text-xs text-dark-400 mt-2">${subtitle}</p>` : ''}
        </div>
    `;
}

function renderLatencyCard(label, value) {
    const getColor = (v) => {
        if (v < 100) return 'text-green-400';
        if (v < 300) return 'text-yellow-400';
        return 'text-red-400';
    };

    return `
        <div class="glass rounded-xl p-4 text-center">
            <p class="text-2xl font-bold ${getColor(value)}">${value}ms</p>
            <p class="text-sm text-dark-400 mt-1">${label}</p>
        </div>
    `;
}

// =====================================================
// MOCK DATA FUNCTIONS
// =====================================================

function getMockOverviewData() {
    return {
        total_calls: 156,
        completed_calls: 142,
        avg_call_duration_seconds: 185.4,
        ai_resolution_rate_percent: 87.5,
        active_sessions: 3,
        total_tokens_today: 52340,
        total_cost_today: 2.34,
        uptime_percent: 99.9,
        hourly_calls: Array.from({ length: 24 }, (_, i) => ({ hour: i, call_count: Math.floor(Math.random() * 15) })),
        agent_distribution: [
            { agent_type: 'triage', count: 45 },
            { agent_type: 'ticket', count: 32 },
            { agent_type: 'network', count: 28 },
            { agent_type: 'device', count: 21 }
        ]
    };
}

function getMockCallData() {
    return {
        total_calls_today: 156,
        completed_calls: 142,
        answered_calls: 148,
        voicemail_calls: 8,
        missed_calls: 0,
        avg_duration_seconds: 185.4,
        total_duration_seconds: 28922,
        peak_hour: 10,
        inbound_calls: 120,
        outbound_calls: 36,
        concurrent_calls_peak: 5,
        call_wait_time_avg: 2.3,
        calls_with_transfer: 12,
        calls_with_conference: 5,
        avg_agent_interactions: 2.1,
        hourly_breakdown: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            call_count: Math.floor(Math.random() * 15),
            avg_duration: Math.floor(Math.random() * 300)
        }))
    };
}

function getMockAIData() {
    return {
        total_ai_interactions: 456,
        successful_resolutions: 398,
        ai_resolution_rate: 87.3,
        avg_response_time_ms: 234,
        total_tokens_used: 52340,
        input_tokens: 18500,
        output_tokens: 33840,
        total_ai_cost_usd: 1.87,
        fallback_to_human: 8,
        avg_sentiment_score: 0.72,
        tool_calls_made: 234,
        cache_hit_rate: 45.2,
        knowledge_base_queries: 189,
        agent_usage: [
            { agent_type: 'triage', count: 156 },
            { agent_type: 'ticket', count: 98 },
            { agent_type: 'network', count: 76 },
            { agent_type: 'device', count: 58 },
            { agent_type: 'email', count: 42 },
            { agent_type: 'printer', count: 26 }
        ]
    };
}

function getMockTicketData() {
    return {
        tickets_created_today: 34,
        open_tickets: 23,
        pending_tickets: 12,
        resolved_tickets: 45,
        escalated_tickets: 5,
        sla_compliance_percent: 94,
        avg_resolution_time_hours: 4.2,
        overdue_tickets: 2,
        sla_breaches: 3,
        tickets_by_priority: getMockPriorityData(),
        open_by_priority: getMockPriorityData()
    };
}

function getMockPriorityData() {
    return [
        { priority: 'Critical', count: 3 },
        { priority: 'High', count: 12 },
        { priority: 'Medium', count: 28 },
        { priority: 'Low', count: 15 }
    ];
}

function getMockCustomerData() {
    return {
        unique_callers_today: 89,
        repeat_callers: 34,
        new_callers: 55,
        repeat_caller_rate_percent: 38.2,
        avg_csat_score: 4.2,
        avg_calls_per_resolution: 1.4,
        csat_distribution: [
            { score: 1, count: 2 },
            { score: 2, count: 5 },
            { score: 3, count: 12 },
            { score: 4, count: 35 },
            { score: 5, count: 46 }
        ],
        top_callers: [
            { caller_name: 'John Smith', caller_phone: '+1234567890', call_count: 8 },
            { caller_name: 'Jane Doe', caller_phone: '+1234567891', call_count: 6 },
            { caller_name: 'Bob Wilson', caller_phone: '+1234567892', call_count: 5 }
        ]
    };
}

function getMockSystemData() {
    return {
        uptime_percent_24h: 99.9,
        uptime_seconds: 864000,
        cpu_usage_percent: 34,
        memory_usage_mb: 512,
        memory_total_mb: 2048,
        disk_usage_percent: 45,
        active_sessions: 3,
        max_sessions: 100,
        api_response_time_ms: 45,
        openai_latency_ms: 230,
        twilio_latency_ms: 120,
        database_latency_ms: 12,
        error_count_5xx: 0,
        error_count_4xx: 5,
        error_rate_percent: 0.02,
        websocket_connections: 2,
        pm2_restarts: 0
    };
}

function getMockCostData() {
    return {
        total_cost_usd: 3.45,
        total_ai_cost_usd: 1.87,
        total_twilio_cost_usd: 1.58,
        cost_per_call_usd: 0.022,
        cost_per_resolution_usd: 0.026,
        total_ai_tokens: 52340,
        total_input_tokens: 18500,
        total_output_tokens: 33840,
        total_audio_tokens: 12500,
        total_twilio_minutes: 482.3,
        total_recording_minutes: 245.1,
        total_api_calls: 456,
        estimated_savings_vs_human_usd: 1560.00,
        first_call_resolution_rate_percent: 78,
        model_usage_breakdown: [
            { model: 'gpt-4o-realtime', tokens: 28000, cost_usd: 1.12 },
            { model: 'gpt-4o-mini', tokens: 24340, cost_usd: 0.75 }
        ]
    };
}

function getMockTrendData() {
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push({
            date: date.toISOString().split('T')[0],
            total_calls: 100 + Math.floor(Math.random() * 100),
            resolved_calls: 80 + Math.floor(Math.random() * 80)
        });
    }

    return {
        daily_trends: days,
        issue_trends: [
            { issue_category: 'Network Issues', count: 45, trend: 'down' },
            { issue_category: 'Password Reset', count: 38, trend: 'up' },
            { issue_category: 'Device Setup', count: 32, trend: 'stable' },
            { issue_category: 'Email Problems', count: 28, trend: 'down' }
        ],
        common_keywords: [
            { keyword: 'password', frequency: 156 },
            { keyword: 'network', frequency: 98 },
            { keyword: 'email', frequency: 87 },
            { keyword: 'printer', frequency: 65 },
            { keyword: 'VPN', frequency: 54 }
        ],
        sentiment_trends: days.map(d => ({
            date: d.date,
            positive: Math.floor(Math.random() * 50) + 30,
            neutral: Math.floor(Math.random() * 30) + 20,
            negative: Math.floor(Math.random() * 20)
        })),
        knowledge_gaps: [
            { question: 'How to configure multi-factor authentication?', frequency: 12 },
            { question: 'VPN connection timeout issues', frequency: 8 },
            { question: 'SharePoint sync problems', frequency: 6 }
        ]
    };
}

function getMockAgentUsage() {
    return [
        { agent_type: 'triage_agent', count: 156 },
        { agent_type: 'ticket_agent', count: 98 },
        { agent_type: 'network_agent', count: 76 },
        { agent_type: 'device_agent', count: 58 }
    ];
}
