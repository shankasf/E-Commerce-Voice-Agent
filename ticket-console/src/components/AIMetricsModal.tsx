'use client';

import { useState, useEffect } from 'react';
import {
    X,
    Bot,
    Users,
    Clock,
    TrendingUp,
    DollarSign,
    MessageSquare,
    Zap,
    ArrowUp,
    Target,
    Award,
    Loader2,
} from 'lucide-react';

interface AIMetrics {
    summary: {
        totalTickets: number;
        resolvedByAI: number;
        resolvedByHuman: number;
        escalatedToHuman: number;
        pendingTickets: number;
        aiResolutionRate: number;
        timeSavedByAI: number;
        costSavedByAI: number;
        avgAIResponseTime: number;
        avgHumanResponseTime: number;
        aiMessagesCount: number;
        humanMessagesCount: number;
    };
    charts: {
        dailyTrend: { date: string; ai: number; human: number }[];
        orgPreference: { name: string; ai: number; human: number; aiPercentage: number }[];
        priorityBreakdown: { priority: string; ai: number; human: number }[];
        firstResponseComparison: { ai: number; human: number };
    };
}

interface AIMetricsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Simple bar chart component
function BarChart({ data, aiColor = '#8B5CF6', humanColor = '#10B981' }: {
    data: { label: string; ai: number; human: number }[];
    aiColor?: string;
    humanColor?: string;
}) {
    const maxValue = Math.max(...data.flatMap(d => [d.ai, d.human]), 1);

    return (
        <div className="space-y-3">
            {data.map((item, idx) => (
                <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">{item.label}</span>
                        <span className="text-xs text-gray-500">AI: {item.ai} | Human: {item.human}</span>
                    </div>
                    <div className="flex gap-1 h-6">
                        <div
                            className="rounded-l transition-all duration-500"
                            style={{
                                width: `${(item.ai / maxValue) * 100}%`,
                                backgroundColor: aiColor,
                                minWidth: item.ai > 0 ? '4px' : '0',
                            }}
                        />
                        <div
                            className="rounded-r transition-all duration-500"
                            style={{
                                width: `${(item.human / maxValue) * 100}%`,
                                backgroundColor: humanColor,
                                minWidth: item.human > 0 ? '4px' : '0',
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Trend line chart (simplified)
function TrendChart({ data }: { data: { date: string; ai: number; human: number }[] }) {
    const maxValue = Math.max(...data.flatMap(d => [d.ai, d.human]), 1);
    const chartHeight = 120;

    // Only show every 5th label
    const showLabel = (idx: number) => idx % 5 === 0;

    return (
        <div className="relative">
            <div className="flex items-end gap-[2px] h-[120px]">
                {data.map((item, idx) => {
                    const aiHeight = (item.ai / maxValue) * chartHeight;
                    const humanHeight = (item.human / maxValue) * chartHeight;
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-[1px]" title={`${item.date}: AI ${item.ai}, Human ${item.human}`}>
                            <div className="w-full flex gap-[1px]" style={{ height: chartHeight }}>
                                <div className="flex-1 flex flex-col justify-end">
                                    <div
                                        className="w-full bg-purple-500 rounded-t transition-all duration-300"
                                        style={{ height: aiHeight }}
                                    />
                                </div>
                                <div className="flex-1 flex flex-col justify-end">
                                    <div
                                        className="w-full bg-green-500 rounded-t transition-all duration-300"
                                        style={{ height: humanHeight }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between mt-2">
                {data.filter((_, idx) => showLabel(idx)).map((item, idx) => (
                    <span key={idx} className="text-[10px] text-gray-400">{item.date}</span>
                ))}
            </div>
        </div>
    );
}

// Circular progress
function CircularProgress({ value, size = 80, strokeWidth = 8, color = '#8B5CF6' }: {
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    className="text-gray-200"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="transition-all duration-500"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke={color}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-800">{value}%</span>
            </div>
        </div>
    );
}

export function AIMetricsModal({ isOpen, onClose }: AIMetricsModalProps) {
    const [metrics, setMetrics] = useState<AIMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadMetrics();
        }
    }, [isOpen]);

    const loadMetrics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/tms/api/ai-metrics');
            if (!response.ok) throw new Error('Failed to load metrics');
            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            setError('Failed to load AI metrics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">AI Performance Metrics</h2>
                            <p className="text-purple-200 text-sm">Comprehensive AI vs Human Support Analysis</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                            <p className="text-gray-500">Loading AI metrics...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-red-500">{error}</p>
                            <button
                                onClick={loadMetrics}
                                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Retry
                            </button>
                        </div>
                    ) : metrics ? (
                        <div className="space-y-6">
                            {/* Top Stats Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* AI Resolution Rate */}
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">AI Resolution Rate</p>
                                            <p className="text-3xl font-bold text-purple-600">{metrics.summary.aiResolutionRate}%</p>
                                            <p className="text-xs text-gray-400 mt-1">of all resolved tickets</p>
                                        </div>
                                        <CircularProgress value={metrics.summary.aiResolutionRate} />
                                    </div>
                                </div>

                                {/* Time Saved */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-green-100 rounded-lg">
                                            <Clock className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Time Saved by AI</p>
                                            <p className="text-2xl font-bold text-green-600">{metrics.summary.timeSavedByAI}h</p>
                                            <p className="text-xs text-gray-400">total hours saved</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cost Savings */}
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-100 rounded-lg">
                                            <DollarSign className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Cost Savings</p>
                                            <p className="text-2xl font-bold text-blue-600">${metrics.summary.costSavedByAI.toLocaleString()}</p>
                                            <p className="text-xs text-gray-400">at $25/hr agent rate</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Response Speed */}
                                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-orange-100 rounded-lg">
                                            <Zap className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">AI Response Speed</p>
                                            <p className="text-2xl font-bold text-orange-600">{metrics.summary.avgAIResponseTime}s</p>
                                            <p className="text-xs text-gray-400">vs {metrics.summary.avgHumanResponseTime}min human</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resolution Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                                    <Target className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-gray-800">{metrics.summary.totalTickets}</p>
                                    <p className="text-xs text-gray-500">Total Tickets</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                                    <Bot className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-purple-600">{metrics.summary.resolvedByAI}</p>
                                    <p className="text-xs text-gray-500">Resolved by AI</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                                    <Users className="w-5 h-5 text-green-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-green-600">{metrics.summary.resolvedByHuman}</p>
                                    <p className="text-xs text-gray-500">Resolved by Human</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                                    <ArrowUp className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-orange-600">{metrics.summary.escalatedToHuman}</p>
                                    <p className="text-xs text-gray-500">Escalated to Human</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                                    <MessageSquare className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-blue-600">{metrics.summary.aiMessagesCount}</p>
                                    <p className="text-xs text-gray-500">AI Messages Sent</p>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Daily Resolution Trend */}
                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-800">30-Day Resolution Trend</h3>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-purple-500 rounded" />
                                            <span className="text-sm text-gray-500">AI</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-500 rounded" />
                                            <span className="text-sm text-gray-500">Human</span>
                                        </div>
                                    </div>
                                    <TrendChart data={metrics.charts.dailyTrend} />
                                </div>

                                {/* Priority Breakdown */}
                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Award className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-800">Resolution by Priority</h3>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-purple-500 rounded" />
                                            <span className="text-sm text-gray-500">AI</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-500 rounded" />
                                            <span className="text-sm text-gray-500">Human</span>
                                        </div>
                                    </div>
                                    <BarChart
                                        data={metrics.charts.priorityBreakdown.map(p => ({
                                            label: p.priority,
                                            ai: p.ai,
                                            human: p.human,
                                        }))}
                                    />
                                </div>
                            </div>

                            {/* Organization Preference */}
                            <div className="bg-white rounded-xl p-5 border border-gray-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-purple-600" />
                                    <h3 className="font-semibold text-gray-800">Organization Support Preference</h3>
                                    <span className="text-sm text-gray-400 ml-auto">AI vs Human Resolution Rate by Organization</span>
                                </div>
                                {metrics.charts.orgPreference.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No organization data available yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {metrics.charts.orgPreference.map((org, idx) => (
                                            <div key={idx} className="flex items-center gap-4">
                                                <div className="w-32 text-sm text-gray-600 truncate" title={org.name}>
                                                    {org.name}
                                                </div>
                                                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden flex">
                                                    <div
                                                        className="bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-center text-xs text-white font-medium transition-all duration-500"
                                                        style={{ width: `${org.aiPercentage}%` }}
                                                    >
                                                        {org.aiPercentage > 15 && `${org.aiPercentage}%`}
                                                    </div>
                                                    <div
                                                        className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-xs text-white font-medium transition-all duration-500"
                                                        style={{ width: `${100 - org.aiPercentage}%` }}
                                                    >
                                                        {100 - org.aiPercentage > 15 && `${100 - org.aiPercentage}%`}
                                                    </div>
                                                </div>
                                                <div className="w-24 text-right">
                                                    <span className="text-xs text-purple-600 font-medium">{org.ai} AI</span>
                                                    <span className="text-gray-300 mx-1">|</span>
                                                    <span className="text-xs text-green-600 font-medium">{org.human} Human</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Response Time Comparison */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    Response Time Advantage
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white/10 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <Bot className="w-8 h-8" />
                                            <div>
                                                <p className="text-3xl font-bold">{metrics.summary.avgAIResponseTime} seconds</p>
                                                <p className="text-purple-200 text-sm">Average AI Response Time</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-8 h-8" />
                                            <div>
                                                <p className="text-3xl font-bold">{metrics.summary.avgHumanResponseTime} minutes</p>
                                                <p className="text-purple-200 text-sm">Average Human Response Time</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-lg">
                                        AI responds{' '}
                                        <span className="font-bold text-2xl text-yellow-300">
                                            {Math.round((metrics.summary.avgHumanResponseTime * 60) / metrics.summary.avgAIResponseTime)}x
                                        </span>{' '}
                                        faster than human agents
                                    </p>
                                </div>
                            </div>

                            {/* AI Benefits Summary */}
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                <h3 className="font-semibold text-gray-800 mb-4">🚀 AI Support Benefits Summary</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                                            <Clock className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">24/7 Availability</p>
                                            <p className="text-sm text-gray-500">AI never sleeps, instant responses anytime</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg shrink-0">
                                            <TrendingUp className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">Scalable Support</p>
                                            <p className="text-sm text-gray-500">Handle unlimited tickets simultaneously</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                            <DollarSign className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">Cost Effective</p>
                                            <p className="text-sm text-gray-500">Reduce support costs by up to 70%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
