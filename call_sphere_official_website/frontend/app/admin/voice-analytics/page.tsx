"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Phone,
    Users,
    Clock,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    Calendar,
    Filter,
    RefreshCw,
    ChevronRight,
    MessageSquare,
    Star,
    Mail,
    Building,
    User as UserIcon,
    X,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewStats {
    totalSessions: number;
    completedSessions: number;
    errorSessions: number;
    qualifiedLeads: number;
    followUpRequired: number;
    avgDuration: number;
    sentimentBreakdown: Record<string, number>;
}

interface Session {
    _id: string;
    sessionId: string;
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    status: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    userCompany?: string;
    userRole?: string;
    intent?: string;
    sentiment?: string;
    leadScore?: number;
    topics?: string[];
    summary?: string;
    actionItems?: string[];
    qualifiedLead?: boolean;
    followUpRequired?: boolean;
    turnCount: number;
    utmSource?: string;
    utmCampaign?: string;
    rawTranscript?: string;
}

interface ConversationTurn {
    _id: string;
    turnIndex: number;
    role: string;
    content: string;
    timestamp: string;
    extractedName?: string;
    extractedEmail?: string;
    extractedPhone?: string;
    extractedCompany?: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function VoiceAnalyticsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [topIntents, setTopIntents] = useState<{ _id: string; count: number }[]>([]);
    const [topTopics, setTopTopics] = useState<{ _id: string; count: number }[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [sessionTurns, setSessionTurns] = useState<ConversationTurn[]>([]);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [qualifiedOnly, setQualifiedOnly] = useState(false);
    const [followUpOnly, setFollowUpOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Mark as authenticated (layout handles auth check)
    useEffect(() => {
        setIsAuthenticated(true);
    }, []);

    // Fetch overview data
    const fetchOverview = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/analytics?view=overview");
            if (!response.ok) {
                if (response.status === 401) {
                    router.push("/admin/login");
                    return;
                }
                throw new Error("Failed to fetch overview");
            }
            const data = await response.json();
            setOverview(data.overview);
            setTopIntents(data.topIntents || []);
            setTopTopics(data.topTopics || []);
        } catch (error) {
            console.error("Failed to fetch overview:", error);
        }
    }, [router]);

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                view: "sessions",
                page: currentPage.toString(),
                limit: "20",
            });

            if (statusFilter) params.set("status", statusFilter);
            if (qualifiedOnly) params.set("qualifiedOnly", "true");
            if (followUpOnly) params.set("followUpOnly", "true");

            const response = await fetch(`/api/admin/analytics?${params}`);
            if (!response.ok) {
                if (response.status === 401) {
                    router.push("/admin/login");
                    return;
                }
                throw new Error("Failed to fetch sessions");
            }
            const data = await response.json();
            setSessions(data.sessions);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, statusFilter, qualifiedOnly, followUpOnly, router]);

    // Fetch session detail
    const fetchSessionDetail = useCallback(async (sessionId: string) => {
        setIsDetailLoading(true);
        try {
            const response = await fetch(`/api/admin/analytics?view=session&sessionId=${sessionId}`);
            if (!response.ok) throw new Error("Failed to fetch session detail");
            const data = await response.json();
            setSelectedSession(data.session);
            setSessionTurns(data.turns);
        } catch (error) {
            console.error("Failed to fetch session detail:", error);
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    // Load data on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetchOverview();
            fetchSessions();
        }
    }, [isAuthenticated, fetchOverview, fetchSessions]);

    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Voice Analytics</h1>
                        <p className="text-slate-400 text-sm">CallSphere AI Voice Agent Dashboard</p>
                    </div>
                    <button
                        onClick={() => { fetchOverview(); fetchSessions(); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* KPI Cards */}
                {overview && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <KPICard
                            icon={<Phone className="w-5 h-5" />}
                            label="Total Sessions"
                            value={overview.totalSessions.toString()}
                            color="indigo"
                        />
                        <KPICard
                            icon={<CheckCircle className="w-5 h-5" />}
                            label="Completed"
                            value={overview.completedSessions.toString()}
                            color="emerald"
                        />
                        <KPICard
                            icon={<XCircle className="w-5 h-5" />}
                            label="Errors"
                            value={overview.errorSessions.toString()}
                            color="red"
                        />
                        <KPICard
                            icon={<Users className="w-5 h-5" />}
                            label="Qualified Leads"
                            value={overview.qualifiedLeads.toString()}
                            color="amber"
                        />
                        <KPICard
                            icon={<AlertCircle className="w-5 h-5" />}
                            label="Follow-up Needed"
                            value={overview.followUpRequired.toString()}
                            color="orange"
                        />
                        <KPICard
                            icon={<Clock className="w-5 h-5" />}
                            label="Avg Duration"
                            value={formatDuration(Math.round(overview.avgDuration))}
                            color="cyan"
                        />
                    </div>
                )}

                {/* Charts Row */}
                {overview && (
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Sentiment Donut Chart */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                                Sentiment Analysis
                            </h3>
                            <div className="flex items-center justify-between">
                                <SentimentDonutChart
                                    positive={overview.sentimentBreakdown.positive || 0}
                                    neutral={overview.sentimentBreakdown.neutral || 0}
                                    negative={overview.sentimentBreakdown.negative || 0}
                                />
                                <div className="space-y-3 flex-1 ml-6">
                                    <SentimentLegendItem
                                        label="Positive"
                                        count={overview.sentimentBreakdown.positive || 0}
                                        total={overview.totalSessions}
                                        color="emerald"
                                    />
                                    <SentimentLegendItem
                                        label="Neutral"
                                        count={overview.sentimentBreakdown.neutral || 0}
                                        total={overview.totalSessions}
                                        color="slate"
                                    />
                                    <SentimentLegendItem
                                        label="Negative"
                                        count={overview.sentimentBreakdown.negative || 0}
                                        total={overview.totalSessions}
                                        color="red"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Session Status Bar Chart */}
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-indigo-400" />
                                Session Breakdown
                            </h3>
                            <SessionStatusBarChart
                                completed={overview.completedSessions}
                                errors={overview.errorSessions}
                                qualifiedLeads={overview.qualifiedLeads}
                                followUp={overview.followUpRequired}
                                total={overview.totalSessions}
                            />
                        </div>
                    </div>
                )}

                {/* Insights Row */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Sentiment Bars */}
                    {overview && (
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                                Sentiment Trends
                            </h3>
                            <div className="space-y-3">
                                <SentimentBar
                                    label="Positive"
                                    count={overview.sentimentBreakdown.positive || 0}
                                    total={overview.totalSessions}
                                    color="emerald"
                                />
                                <SentimentBar
                                    label="Neutral"
                                    count={overview.sentimentBreakdown.neutral || 0}
                                    total={overview.totalSessions}
                                    color="slate"
                                />
                                <SentimentBar
                                    label="Negative"
                                    count={overview.sentimentBreakdown.negative || 0}
                                    total={overview.totalSessions}
                                    color="red"
                                />
                            </div>
                        </div>
                    )}

                    {/* Top Intents */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-400" />
                            Top Intents
                        </h3>
                        <div className="space-y-2">
                            {topIntents.slice(0, 5).map((intent, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300 truncate">{intent._id}</span>
                                    <span className="text-slate-500">{intent.count}</span>
                                </div>
                            ))}
                            {topIntents.length === 0 && (
                                <p className="text-slate-500 text-sm">No data yet</p>
                            )}
                        </div>
                    </div>

                    {/* Top Topics */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-indigo-400" />
                            Top Topics
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {topTopics.slice(0, 8).map((topic, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm rounded-full"
                                >
                                    {topic._id}
                                </span>
                            ))}
                            {topTopics.length === 0 && (
                                <p className="text-slate-500 text-sm">No data yet</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="error">Error</option>
                        <option value="active">Active</option>
                        <option value="abandoned">Abandoned</option>
                    </select>

                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={qualifiedOnly}
                            onChange={(e) => { setQualifiedOnly(e.target.checked); setCurrentPage(1); }}
                            className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                        />
                        Qualified leads only
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={followUpOnly}
                            onChange={(e) => { setFollowUpOnly(e.target.checked); setCurrentPage(1); }}
                            className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                        />
                        Follow-up required
                    </label>
                </div>

                {/* Sessions Table */}
                <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 text-left">
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-300">Time</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-300">User</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-300">Intent</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-300">Score</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-300">Duration</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-300"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading sessions...
                                        </td>
                                    </tr>
                                ) : sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            No sessions found
                                        </td>
                                    </tr>
                                ) : (
                                    sessions.map((session) => (
                                        <tr
                                            key={session._id}
                                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                            onClick={() => fetchSessionDetail(session.sessionId)}
                                        >
                                            <td className="px-6 py-4 text-sm text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-500" />
                                                    {formatDate(session.startedAt)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {session.userName || session.userEmail ? (
                                                    <div>
                                                        {session.userName && (
                                                            <div className="text-sm text-white">{session.userName}</div>
                                                        )}
                                                        {session.userEmail && (
                                                            <div className="text-xs text-slate-500">{session.userEmail}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-sm">Anonymous</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300">
                                                {session.intent || <span className="text-slate-500">—</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={session.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                {session.leadScore ? (
                                                    <LeadScoreBadge score={session.leadScore} />
                                                ) : (
                                                    <span className="text-slate-500 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {session.durationSeconds
                                                    ? formatDuration(session.durationSeconds)
                                                    : "—"
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                <ChevronRight className="w-4 h-4 text-slate-500" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                            <p className="text-sm text-slate-500">
                                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                                {pagination.total} sessions
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                                    disabled={currentPage === pagination.pages}
                                    className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Session Detail Modal */}
            {(selectedSession || isDetailLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl">
                        {isDetailLoading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                            </div>
                        ) : selectedSession && (
                            <>
                                {/* Modal Header */}
                                <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Session Detail</h2>
                                        <p className="text-slate-500 text-sm">{formatDate(selectedSession.startedAt)}</p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedSession(null); setSessionTurns([]); }}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6 space-y-6">
                                    {/* User Info */}
                                    {(selectedSession.userName || selectedSession.userEmail || selectedSession.userPhone || selectedSession.userCompany) && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-3">Contact Info</h3>
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                {selectedSession.userName && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <UserIcon className="w-4 h-4 text-slate-500" />
                                                        <span className="text-white">{selectedSession.userName}</span>
                                                    </div>
                                                )}
                                                {selectedSession.userEmail && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail className="w-4 h-4 text-slate-500" />
                                                        <span className="text-white">{selectedSession.userEmail}</span>
                                                    </div>
                                                )}
                                                {selectedSession.userPhone && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone className="w-4 h-4 text-slate-500" />
                                                        <span className="text-white">{selectedSession.userPhone}</span>
                                                    </div>
                                                )}
                                                {selectedSession.userCompany && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Building className="w-4 h-4 text-slate-500" />
                                                        <span className="text-white">{selectedSession.userCompany}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Analytics */}
                                    <div className="grid sm:grid-cols-4 gap-4">
                                        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                            <StatusBadge status={selectedSession.status} />
                                            <p className="text-slate-500 text-xs mt-2">Status</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                            {selectedSession.leadScore ? (
                                                <LeadScoreBadge score={selectedSession.leadScore} />
                                            ) : (
                                                <span className="text-slate-500">—</span>
                                            )}
                                            <p className="text-slate-500 text-xs mt-2">Lead Score</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                            <span className={cn(
                                                "text-lg font-semibold",
                                                selectedSession.sentiment === "positive" && "text-emerald-400",
                                                selectedSession.sentiment === "negative" && "text-red-400",
                                                selectedSession.sentiment === "neutral" && "text-slate-400",
                                            )}>
                                                {selectedSession.sentiment || "—"}
                                            </span>
                                            <p className="text-slate-500 text-xs mt-2">Sentiment</p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                            <span className="text-lg font-semibold text-white">
                                                {selectedSession.durationSeconds
                                                    ? formatDuration(selectedSession.durationSeconds)
                                                    : "—"
                                                }
                                            </span>
                                            <p className="text-slate-500 text-xs mt-2">Duration</p>
                                        </div>
                                    </div>

                                    {/* Intent & Summary */}
                                    {selectedSession.intent && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">Intent</h3>
                                            <p className="text-white">{selectedSession.intent}</p>
                                        </div>
                                    )}

                                    {selectedSession.summary && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">Summary</h3>
                                            <p className="text-slate-300">{selectedSession.summary}</p>
                                        </div>
                                    )}

                                    {/* Topics */}
                                    {selectedSession.topics && selectedSession.topics.length > 0 && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-3">Topics</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedSession.topics.map((topic, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm rounded-full"
                                                    >
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Items */}
                                    {selectedSession.actionItems && selectedSession.actionItems.length > 0 && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-3">Action Items</h3>
                                            <ul className="space-y-2">
                                                {selectedSession.actionItems.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                        <span className="text-indigo-400">•</span>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Flags */}
                                    <div className="flex gap-4">
                                        {selectedSession.qualifiedLead && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-300 text-sm rounded-full">
                                                <Star className="w-3 h-3" />
                                                Qualified Lead
                                            </span>
                                        )}
                                        {selectedSession.followUpRequired && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-300 text-sm rounded-full">
                                                <AlertCircle className="w-3 h-3" />
                                                Follow-up Required
                                            </span>
                                        )}
                                    </div>

                                    {/* Raw Transcript */}
                                    {selectedSession.rawTranscript && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-4">Raw Transcript</h3>
                                            <div className="bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                                                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                                                    {selectedSession.rawTranscript}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Conversation */}
                                    {sessionTurns.length > 0 && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-4">Conversation Turns</h3>
                                            <div className="space-y-4 max-h-80 overflow-y-auto">
                                                {sessionTurns.map((turn) => (
                                                    <div
                                                        key={turn._id}
                                                        className={cn(
                                                            "p-3 rounded-xl",
                                                            turn.role === "user"
                                                                ? "bg-indigo-500/10 ml-8"
                                                                : "bg-slate-700/50 mr-8"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={cn(
                                                                "text-xs font-semibold uppercase",
                                                                turn.role === "user" ? "text-indigo-400" : "text-emerald-400"
                                                            )}>
                                                                {turn.role}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {new Date(turn.timestamp).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-300">{turn.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Marketing Source */}
                                    {(selectedSession.utmSource || selectedSession.utmCampaign) && (
                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">Marketing Source</h3>
                                            <div className="text-sm text-slate-300">
                                                {selectedSession.utmSource && (
                                                    <span>Source: {selectedSession.utmSource}</span>
                                                )}
                                                {selectedSession.utmSource && selectedSession.utmCampaign && " · "}
                                                {selectedSession.utmCampaign && (
                                                    <span>Campaign: {selectedSession.utmCampaign}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Components
function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    const colorClasses: Record<string, string> = {
        indigo: "bg-indigo-500/20 text-indigo-400",
        emerald: "bg-emerald-500/20 text-emerald-400",
        red: "bg-red-500/20 text-red-400",
        amber: "bg-amber-500/20 text-amber-400",
        orange: "bg-orange-500/20 text-orange-400",
        cyan: "bg-cyan-500/20 text-cyan-400",
    };

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
            <div className={cn("inline-flex p-2 rounded-lg mb-3", colorClasses[color])}>
                {icon}
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
        </div>
    );
}

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const barColor: Record<string, string> = {
        emerald: "bg-emerald-500",
        slate: "bg-slate-500",
        red: "bg-red-500",
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-500">{count}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all", barColor[color])}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

// Donut Chart for Sentiment Analysis
function SentimentDonutChart({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
    const total = positive + neutral + negative;

    // Calculate percentages for the donut segments
    const positivePercent = total > 0 ? (positive / total) * 100 : 0;
    const neutralPercent = total > 0 ? (neutral / total) * 100 : 0;
    const negativePercent = total > 0 ? (negative / total) * 100 : 0;

    // SVG donut chart calculations
    const size = 120;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke offsets for each segment
    const neutralOffset = (positivePercent / 100) * circumference;
    const negativeOffset = ((positivePercent + neutralPercent) / 100) * circumference;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <div className="text-center">
                    <div className="text-2xl font-bold text-slate-500">0</div>
                    <div className="text-xs text-slate-600">No data</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth={strokeWidth}
                />
                {/* Positive segment (green) */}
                {positivePercent > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${(positivePercent / 100) * circumference} ${circumference}`}
                        strokeDashoffset={0}
                        className="transition-all duration-500"
                    />
                )}
                {/* Neutral segment (gray) */}
                {neutralPercent > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${(neutralPercent / 100) * circumference} ${circumference}`}
                        strokeDashoffset={-neutralOffset}
                        className="transition-all duration-500"
                    />
                )}
                {/* Negative segment (red) */}
                {negativePercent > 0 && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${(negativePercent / 100) * circumference} ${circumference}`}
                        strokeDashoffset={-negativeOffset}
                        className="transition-all duration-500"
                    />
                )}
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">{total}</div>
                    <div className="text-xs text-slate-400">Total</div>
                </div>
            </div>
        </div>
    );
}

// Legend item for sentiment donut chart
function SentimentLegendItem({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const dotColor: Record<string, string> = {
        emerald: "bg-emerald-500",
        slate: "bg-slate-500",
        red: "bg-red-500",
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", dotColor[color])} />
                <span className="text-sm text-slate-300">{label}</span>
            </div>
            <div className="text-right">
                <span className="text-sm font-medium text-white">{count}</span>
                <span className="text-xs text-slate-500 ml-1">({percentage}%)</span>
            </div>
        </div>
    );
}

// Bar Chart for Session Status Breakdown
function SessionStatusBarChart({
    completed,
    errors,
    qualifiedLeads,
    followUp,
    total
}: {
    completed: number;
    errors: number;
    qualifiedLeads: number;
    followUp: number;
    total: number;
}) {
    const maxValue = Math.max(completed, errors, qualifiedLeads, followUp, 1);

    const bars = [
        { label: "Completed", value: completed, color: "bg-emerald-500", textColor: "text-emerald-400" },
        { label: "Errors", value: errors, color: "bg-red-500", textColor: "text-red-400" },
        { label: "Qualified Leads", value: qualifiedLeads, color: "bg-amber-500", textColor: "text-amber-400" },
        { label: "Follow-up", value: followUp, color: "bg-orange-500", textColor: "text-orange-400" },
    ];

    return (
        <div className="space-y-4">
            {bars.map((bar, index) => {
                const percentage = maxValue > 0 ? (bar.value / maxValue) * 100 : 0;
                const percentOfTotal = total > 0 ? Math.round((bar.value / total) * 100) : 0;

                return (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">{bar.label}</span>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-sm font-semibold", bar.textColor)}>{bar.value}</span>
                                <span className="text-xs text-slate-500">({percentOfTotal}%)</span>
                            </div>
                        </div>
                        <div className="h-6 bg-slate-800 rounded-lg overflow-hidden relative">
                            <div
                                className={cn("h-full rounded-lg transition-all duration-500 flex items-center", bar.color)}
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                            >
                                {percentage > 15 && (
                                    <span className="text-xs font-medium text-white ml-2">{bar.value}</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Total summary */}
            <div className="pt-3 border-t border-slate-700">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-300">Total Sessions</span>
                    <span className="text-lg font-bold text-white">{total}</span>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const statusStyles: Record<string, string> = {
        completed: "bg-emerald-500/20 text-emerald-400",
        active: "bg-indigo-500/20 text-indigo-400",
        error: "bg-red-500/20 text-red-400",
        abandoned: "bg-slate-500/20 text-slate-400",
    };

    return (
        <span className={cn(
            "inline-block px-2 py-1 text-xs font-medium rounded-full capitalize",
            statusStyles[status] || statusStyles.active
        )}>
            {status}
        </span>
    );
}

function LeadScoreBadge({ score }: { score: number }) {
    const color = score >= 7 ? "text-emerald-400" : score >= 4 ? "text-amber-400" : "text-red-400";

    return (
        <span className={cn("text-lg font-semibold", color)}>
            {score}/10
        </span>
    );
}
