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
    Calendar,
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

// Multi-line chart component for AI vs Human comparison
function MultiLineChart({
    data,
    height = 200,
    showArea = true,
    title,
    yAxisLabel
}: {
    data: { label: string; ai: number; human: number }[];
    height?: number;
    showArea?: boolean;
    title?: string;
    yAxisLabel?: string;
}) {
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; ai: number; human: number; label: string } | null>(null);

    if (data.length === 0) return <div className="text-gray-400 text-center py-8">No data available</div>;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 100; // percentage-based
    const chartWidth = 100 - ((padding.left + padding.right) / 5);
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.flatMap(d => [d.ai, d.human]), 1);
    const minValue = 0;

    // Calculate points for AI line
    const aiPoints = data.map((d, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: ((maxValue - d.ai) / (maxValue - minValue)) * 100,
        value: d.ai,
        label: d.label
    }));

    // Calculate points for Human line
    const humanPoints = data.map((d, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: ((maxValue - d.human) / (maxValue - minValue)) * 100,
        value: d.human,
        label: d.label
    }));

    // Create SVG path for line
    const createLinePath = (points: typeof aiPoints) => {
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    // Create SVG path for area
    const createAreaPath = (points: typeof aiPoints) => {
        const linePath = createLinePath(points);
        return `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
    };

    // Y-axis labels
    const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
        value: Math.round(minValue + (maxValue - minValue) * (1 - t)),
        y: t * 100
    }));

    return (
        <div className="relative w-full" style={{ height }}>
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
                style={{ overflow: 'visible' }}
            >
                {/* Grid lines */}
                <g className="text-gray-200">
                    {yAxisTicks.map((tick, i) => (
                        <line
                            key={i}
                            x1="0"
                            y1={tick.y}
                            x2="100"
                            y2={tick.y}
                            stroke="currentColor"
                            strokeWidth="0.2"
                            strokeDasharray="1,1"
                        />
                    ))}
                </g>

                {/* Area fills */}
                {showArea && (
                    <>
                        <path
                            d={createAreaPath(aiPoints)}
                            fill="url(#aiGradient)"
                            opacity="0.3"
                        />
                        <path
                            d={createAreaPath(humanPoints)}
                            fill="url(#humanGradient)"
                            opacity="0.3"
                        />
                    </>
                )}

                {/* Lines */}
                <path
                    d={createLinePath(aiPoints)}
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="0.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                />
                <path
                    d={createLinePath(humanPoints)}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="0.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                />

                {/* Data points */}
                {aiPoints.map((p, i) => (
                    <circle
                        key={`ai-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r="0.8"
                        fill="#8B5CF6"
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredPoint({ x: p.x, y: p.y, ai: p.value, human: humanPoints[i].value, label: p.label })}
                        onMouseLeave={() => setHoveredPoint(null)}
                    />
                ))}
                {humanPoints.map((p, i) => (
                    <circle
                        key={`human-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r="0.8"
                        fill="#10B981"
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredPoint({ x: p.x, y: p.y, ai: aiPoints[i].value, human: p.value, label: p.label })}
                        onMouseLeave={() => setHoveredPoint(null)}
                    />
                ))}

                {/* Gradient definitions */}
                <defs>
                    <linearGradient id="aiGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="humanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 -ml-8">
                {yAxisTicks.map((tick, i) => (
                    <span key={i}>{tick.value}</span>
                ))}
            </div>

            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-gray-400 -mb-5">
                {data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map((d, i) => (
                    <span key={i}>{d.label}</span>
                ))}
            </div>

            {/* Tooltip */}
            {hoveredPoint && (
                <div
                    className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg z-10"
                    style={{
                        left: `${hoveredPoint.x}%`,
                        top: `${Math.min(hoveredPoint.y, 70)}%`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="font-medium mb-1">{hoveredPoint.label}</div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span>AI: {hoveredPoint.ai}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span>Human: {hoveredPoint.human}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Response Time Line Chart (for comparing response times over time)
function ResponseTimeChart({ data }: { data: { label: string; ai: number; human: number }[] }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    if (data.length === 0) return <div className="text-gray-400 text-center py-8">No data available</div>;

    const maxAI = Math.max(...data.map(d => d.ai), 1);
    const maxHuman = Math.max(...data.map(d => d.human), 1);

    return (
        <div className="relative h-[180px]">
            <div className="flex items-end justify-between h-full gap-1 pb-6">
                {data.map((item, idx) => {
                    const aiHeight = (item.ai / maxAI) * 100;
                    const humanHeight = (item.human / maxHuman) * 100;
                    const isHovered = hoveredIdx === idx;

                    return (
                        <div
                            key={idx}
                            className="flex-1 flex flex-col items-center cursor-pointer relative"
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            <div className="flex gap-[2px] items-end h-[140px] w-full">
                                <div
                                    className={`flex-1 rounded-t transition-all duration-300 ${isHovered ? 'bg-purple-600' : 'bg-purple-400'}`}
                                    style={{ height: `${aiHeight}%` }}
                                />
                                <div
                                    className={`flex-1 rounded-t transition-all duration-300 ${isHovered ? 'bg-green-600' : 'bg-green-400'}`}
                                    style={{ height: `${humanHeight}%` }}
                                />
                            </div>
                            {isHovered && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                                    <div className="font-medium mb-1">{item.label}</div>
                                    <div>AI: {item.ai}s | Human: {item.human}min</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-gray-400">
                {data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map((d, i) => (
                    <span key={i}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}

// Cumulative Line Chart
function CumulativeChart({ data }: { data: { label: string; ai: number; human: number }[] }) {
    const [hoveredPoint, setHoveredPoint] = useState<{ idx: number; x: number; y: number } | null>(null);

    if (data.length === 0) return <div className="text-gray-400 text-center py-8">No data available</div>;

    // Calculate cumulative values
    let cumulativeAI = 0;
    let cumulativeHuman = 0;
    const cumulativeData = data.map(d => {
        cumulativeAI += d.ai;
        cumulativeHuman += d.human;
        return { label: d.label, ai: cumulativeAI, human: cumulativeHuman };
    });

    const maxValue = Math.max(cumulativeData[cumulativeData.length - 1]?.ai || 0, cumulativeData[cumulativeData.length - 1]?.human || 0, 1);

    const aiPoints = cumulativeData.map((d, i) => ({
        x: (i / (cumulativeData.length - 1)) * 100,
        y: 100 - (d.ai / maxValue) * 100,
        value: d.ai
    }));

    const humanPoints = cumulativeData.map((d, i) => ({
        x: (i / (cumulativeData.length - 1)) * 100,
        y: 100 - (d.human / maxValue) * 100,
        value: d.human
    }));

    const createPath = (points: typeof aiPoints) =>
        points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const createAreaPath = (points: typeof aiPoints) =>
        `${createPath(points)} L 100 100 L 0 100 Z`;

    return (
        <div className="relative h-[180px]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                {/* Grid */}
                {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
                ))}

                {/* Areas */}
                <path d={createAreaPath(aiPoints)} fill="#8B5CF6" opacity="0.2" />
                <path d={createAreaPath(humanPoints)} fill="#10B981" opacity="0.2" />

                {/* Lines */}
                <path d={createPath(aiPoints)} fill="none" stroke="#8B5CF6" strokeWidth="0.4" />
                <path d={createPath(humanPoints)} fill="none" stroke="#10B981" strokeWidth="0.4" />

                {/* Points */}
                {aiPoints.map((p, i) => (
                    <circle
                        key={`ai-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPoint?.idx === i ? "1.2" : "0.6"}
                        fill="#8B5CF6"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredPoint({ idx: i, x: p.x, y: p.y })}
                        onMouseLeave={() => setHoveredPoint(null)}
                    />
                ))}
                {humanPoints.map((p, i) => (
                    <circle
                        key={`human-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPoint?.idx === i ? "1.2" : "0.6"}
                        fill="#10B981"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredPoint({ idx: i, x: p.x, y: p.y })}
                        onMouseLeave={() => setHoveredPoint(null)}
                    />
                ))}
            </svg>

            {/* Y-axis */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-400 -ml-6">
                <span>{maxValue}</span>
                <span>{Math.round(maxValue / 2)}</span>
                <span>0</span>
            </div>

            {/* Tooltip */}
            {hoveredPoint && (
                <div
                    className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg z-10"
                    style={{ left: `${hoveredPoint.x}%`, top: '10%', transform: 'translateX(-50%)' }}
                >
                    <div className="font-medium">{cumulativeData[hoveredPoint.idx].label}</div>
                    <div>AI Total: {cumulativeData[hoveredPoint.idx].ai}</div>
                    <div>Human Total: {cumulativeData[hoveredPoint.idx].human}</div>
                </div>
            )}
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

type DateRange = '7d' | '14d' | '30d' | '60d' | '90d' | 'custom';

export function AIMetricsModal({ isOpen, onClose }: AIMetricsModalProps) {
    const [metrics, setMetrics] = useState<AIMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [showCustomRange, setShowCustomRange] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadMetrics();
        }
    }, [isOpen, dateRange, customStartDate, customEndDate]);

    const loadMetrics = async () => {
        try {
            setLoading(true);
            setError(null);
            
            let url = '/tms/api/ai-metrics?';
            if (dateRange === 'custom' && customStartDate && customEndDate) {
                url += `startDate=${customStartDate}&endDate=${customEndDate}`;
            } else {
                const days = parseInt(dateRange.replace('d', ''));
                url += `days=${days}`;
            }
            
            const response = await fetch(url);
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

                {/* Date Range Filter */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 font-medium">Date Range:</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {(['7d', '14d', '30d', '60d', '90d'] as DateRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => {
                                        setDateRange(range);
                                        setShowCustomRange(false);
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        dateRange === range && !showCustomRange
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    {range.replace('d', ' Days')}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowCustomRange(!showCustomRange)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    showCustomRange
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                Custom
                            </button>
                        </div>
                    </div>
                    {showCustomRange && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-500">From:</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-500">To:</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (customStartDate && customEndDate) {
                                        setDateRange('custom');
                                    }
                                }}
                                disabled={!customStartDate || !customEndDate}
                                className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
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
                                {/* Daily Resolution Trend - Line Chart */}
                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-800">Daily Resolution Trend</h3>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-purple-500 rounded" />
                                            <span className="text-sm text-gray-500">AI Resolved</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-500 rounded" />
                                            <span className="text-sm text-gray-500">Human Resolved</span>
                                        </div>
                                    </div>
                                    <div className="pl-8 pr-2">
                                        <MultiLineChart
                                            data={metrics.charts.dailyTrend.map(d => ({ label: d.date, ai: d.ai, human: d.human }))}
                                            height={200}
                                            showArea={true}
                                        />
                                    </div>
                                </div>

                                {/* Cumulative Resolutions - Area Chart */}
                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Target className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-800">Cumulative Resolutions</h3>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-purple-500 rounded" />
                                            <span className="text-sm text-gray-500">AI Total</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-500 rounded" />
                                            <span className="text-sm text-gray-500">Human Total</span>
                                        </div>
                                    </div>
                                    <div className="pl-8 pr-2">
                                        <CumulativeChart
                                            data={metrics.charts.dailyTrend.map(d => ({ label: d.date, ai: d.ai, human: d.human }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Second Row of Charts */}
                            <div className="grid md:grid-cols-2 gap-6">
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

                                {/* Messages Activity Comparison */}
                                <div className="bg-white rounded-xl p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MessageSquare className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-gray-800">Messages Activity</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* AI Messages */}
                                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                                            <Bot className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                                            <p className="text-3xl font-bold text-purple-600">{metrics.summary.aiMessagesCount}</p>
                                            <p className="text-sm text-gray-500 mt-1">AI Messages</p>
                                            <div className="mt-3 bg-purple-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(metrics.summary.aiMessagesCount / (metrics.summary.aiMessagesCount + metrics.summary.humanMessagesCount || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        {/* Human Messages */}
                                        <div className="bg-green-50 rounded-xl p-4 text-center">
                                            <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                            <p className="text-3xl font-bold text-green-600">{metrics.summary.humanMessagesCount}</p>
                                            <p className="text-sm text-gray-500 mt-1">Human Messages</p>
                                            <div className="mt-3 bg-green-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${(metrics.summary.humanMessagesCount / (metrics.summary.aiMessagesCount + metrics.summary.humanMessagesCount || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Efficiency Comparison */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">AI Response Ratio</span>
                                            <span className="font-semibold text-purple-600">
                                                {Math.round((metrics.summary.aiMessagesCount / (metrics.summary.aiMessagesCount + metrics.summary.humanMessagesCount || 1)) * 100)}%
                                            </span>
                                        </div>
                                    </div>
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
