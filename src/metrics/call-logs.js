/**
 * Call Log Tools - For tracking call metrics
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { query, insert, update, supabase } from '../db/supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Call Logs Table (needs to be created)
// ─────────────────────────────────────────────────────────────────────────────

export async function createCallLog(data) {
    return await insert('call_logs', {
        call_sid: data.callSid,
        session_id: data.sessionId,
        from_number: data.fromNumber,
        to_number: data.toNumber,
        direction: data.direction || 'inbound',
        started_at: new Date().toISOString(),
        status: 'active',
    });
}

export async function updateCallLog(sessionId, updates) {
    return await update('call_logs', { session_id: sessionId }, updates);
}

export async function endCallLog(sessionId, data) {
    const endedAt = new Date();

    return await update('call_logs', { session_id: sessionId }, {
        ended_at: endedAt.toISOString(),
        duration_seconds: data.durationSeconds,
        transcript: data.transcript,
        transcript_json: data.transcriptJson,
        summary: data.summary,
        sentiment: data.sentiment,
        lead_score: data.leadScore,
        tool_calls_json: data.toolCalls,
        tools_used: data.toolsUsed,
        tool_call_count: data.toolCalls?.length || 0,
        tool_success_count: data.toolSuccessCount || 0,
        tool_failure_count: data.toolFailureCount || 0,
        conversion: data.conversion || false,
        follow_up_needed: data.followUpNeeded || false,
        escalated: data.escalated || false,
        status: 'completed',
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Metrics
// ─────────────────────────────────────────────────────────────────────────────

export async function getCallMetrics(range = 'all') {
    const rangeFilter = getTimeRangeFilter(range);

    let q = supabase.from('call_logs').select('*').order('ended_at', { ascending: false });

    if (rangeFilter) {
        q = q.gte('ended_at', rangeFilter);
    }

    const { data: logs, error } = await q.limit(500);

    if (error) throw error;
    if (!logs || !logs.length) return getEmptyMetrics();

    return computeMetrics(logs);
}

function getTimeRangeFilter(range) {
    const now = new Date();
    switch (range) {
        case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        case '7d':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        case '30d':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        case '90d':
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        default:
            return null;
    }
}

function getEmptyMetrics() {
    return {
        totalCalls: 0,
        avgDuration: 0,
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
        avgLeadScore: 0,
        conversionRate: 0,
        followUpRate: 0,
        escalationRate: 0,
        toolUsage: {},
        hourlyDistribution: Array(24).fill(0),
        dailyVolume: [],
        topCallers: [],
        recentCalls: [],
    };
}

function computeMetrics(logs) {
    const totalCalls = logs.length;

    // Average duration
    const durations = logs.filter(l => l.duration_seconds).map(l => l.duration_seconds);
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Sentiment breakdown
    const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
    logs.forEach(l => {
        const s = (l.sentiment || 'unknown').toLowerCase();
        if (s.includes('positive')) sentimentBreakdown.positive++;
        else if (s.includes('negative')) sentimentBreakdown.negative++;
        else if (s.includes('neutral')) sentimentBreakdown.neutral++;
        else sentimentBreakdown.unknown++;
    });

    // Average lead score
    const leadScores = logs.filter(l => l.lead_score != null).map(l => l.lead_score);
    const avgLeadScore = leadScores.length ? Math.round(leadScores.reduce((a, b) => a + b, 0) / leadScores.length) : 0;

    // Conversion rate
    const conversions = logs.filter(l => l.conversion).length;
    const conversionRate = totalCalls ? Math.round((conversions / totalCalls) * 100) : 0;

    // Follow-up rate
    const followUps = logs.filter(l => l.follow_up_needed).length;
    const followUpRate = totalCalls ? Math.round((followUps / totalCalls) * 100) : 0;

    // Escalation rate
    const escalations = logs.filter(l => l.escalated).length;
    const escalationRate = totalCalls ? Math.round((escalations / totalCalls) * 100) : 0;

    // Tool usage
    const toolUsage = {};
    logs.forEach(l => {
        if (l.tools_used && Array.isArray(l.tools_used)) {
            l.tools_used.forEach(tool => {
                toolUsage[tool] = (toolUsage[tool] || 0) + 1;
            });
        }
    });

    // Hourly distribution
    const hourlyDistribution = Array(24).fill(0);
    logs.forEach(l => {
        if (l.started_at) {
            const hour = new Date(l.started_at).getHours();
            hourlyDistribution[hour]++;
        }
    });

    // Daily volume (last 30 days)
    const dailyVolume = {};
    logs.forEach(l => {
        if (l.started_at) {
            const date = new Date(l.started_at).toISOString().split('T')[0];
            dailyVolume[date] = (dailyVolume[date] || 0) + 1;
        }
    });
    const dailyVolumeArray = Object.entries(dailyVolume)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

    // Top callers
    const callerCounts = {};
    logs.forEach(l => {
        if (l.from_number) {
            callerCounts[l.from_number] = (callerCounts[l.from_number] || 0) + 1;
        }
    });
    const topCallers = Object.entries(callerCounts)
        .map(([number, count]) => ({ number, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Recent calls
    const recentCalls = logs.slice(0, 20).map(l => ({
        sessionId: l.session_id,
        callSid: l.call_sid,
        fromNumber: l.from_number,
        duration: l.duration_seconds,
        sentiment: l.sentiment,
        leadScore: l.lead_score,
        conversion: l.conversion,
        endedAt: l.ended_at,
        summary: l.summary,
    }));

    // Lead score distribution
    const leadBands = { hot: 0, warm: 0, cold: 0 };
    logs.forEach(l => {
        if (l.lead_score >= 70) leadBands.hot++;
        else if (l.lead_score >= 40) leadBands.warm++;
        else leadBands.cold++;
    });

    return {
        totalCalls,
        avgDuration,
        sentimentBreakdown,
        avgLeadScore,
        conversionRate,
        followUpRate,
        escalationRate,
        toolUsage,
        hourlyDistribution,
        dailyVolume: dailyVolumeArray,
        topCallers,
        recentCalls,
        leadBands,
        conversions,
        followUps,
        escalations,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export for CSV
// ─────────────────────────────────────────────────────────────────────────────

export async function exportCallLogs(range = 'all') {
    const rangeFilter = getTimeRangeFilter(range);

    let q = supabase.from('call_logs').select('*').order('ended_at', { ascending: false });

    if (rangeFilter) {
        q = q.gte('ended_at', rangeFilter);
    }

    const { data: logs, error } = await q;
    if (error) throw error;

    return logs || [];
}

export function logsToCSV(logs) {
    if (!logs.length) return '';

    const headers = [
        'session_id', 'call_sid', 'from_number', 'to_number', 'direction',
        'started_at', 'ended_at', 'duration_seconds', 'sentiment', 'lead_score',
        'conversion', 'follow_up_needed', 'escalated', 'summary'
    ];

    const rows = logs.map(log => headers.map(h => {
        const val = log[h];
        if (val == null) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val.replace(/"/g, '""')}"`;
        return val;
    }).join(','));

    return [headers.join(','), ...rows].join('\n');
}
