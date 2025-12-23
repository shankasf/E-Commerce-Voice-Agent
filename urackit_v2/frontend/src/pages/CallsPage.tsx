import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../components/layout';
import { MetricCard, Card, LoadingSpinner, EmptyState } from '../components/common';
import { HourlyCallsChart, AgentDistributionChart, CostTrendChart } from '../components/dashboard/Charts';
import { dashboardApi } from '../services/api';
import { Phone, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function CallsPage() {
    const { data: calls, isLoading, refetch } = useQuery({
        queryKey: ['dashboard-calls'],
        queryFn: () => dashboardApi.getCalls(),
    });

    const metrics = calls?.metrics;
    const callLogs = calls?.calls || [];

    if (isLoading) {
        return (
            <DashboardLayout title="Call Analytics" subtitle="Monitor call performance and agent distribution">
                <LoadingSpinner size="lg" />
            </DashboardLayout>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'failed':
            case 'error':
                return <XCircle className="w-4 h-4 text-red-400" />;
            case 'in_progress':
                return <Clock className="w-4 h-4 text-yellow-400" />;
            default:
                return <AlertCircle className="w-4 h-4 text-dark-400" />;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-green-600/20 text-green-400';
            case 'failed':
            case 'error':
                return 'bg-red-600/20 text-red-400';
            case 'in_progress':
                return 'bg-yellow-600/20 text-yellow-400';
            default:
                return 'bg-dark-600/20 text-dark-400';
        }
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    return (
        <DashboardLayout
            title="Call Analytics"
            subtitle="Monitor call performance and agent distribution"
            onRefresh={() => refetch()}
        >
            <div className="fade-in space-y-6">
                {/* Top Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <MetricCard
                        label="Total Calls"
                        value={metrics?.total_calls || 0}
                        icon="phone"
                        color="primary"
                    />
                    <MetricCard
                        label="Completed"
                        value={metrics?.completed || 0}
                        icon="check"
                        color="green"
                    />
                    <MetricCard
                        label="In Progress"
                        value={metrics?.in_progress || 0}
                        icon="activity"
                        color="yellow"
                    />
                    <MetricCard
                        label="Failed"
                        value={metrics?.failed || 0}
                        icon="x"
                        color="red"
                    />
                    <MetricCard
                        label="Avg Duration"
                        value={formatDuration(Math.round(metrics?.avg_duration_seconds || 0))}
                        icon="clock"
                        color="blue"
                    />
                    <MetricCard
                        label="AI Resolution"
                        value={`${metrics?.ai_resolution_rate || 0}%`}
                        icon="zap"
                        color="purple"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <HourlyCallsChart
                        title="Hourly Call Volume"
                        data={metrics?.hourly_calls || []}
                    />
                    <AgentDistributionChart
                        title="Agent Distribution"
                        data={metrics?.by_agent || []}
                    />
                </div>

                {/* Cost Trend */}
                <CostTrendChart
                    title="Daily Cost Trend"
                    data={metrics?.daily_costs || []}
                />

                {/* Call Logs Table */}
                <Card title="Recent Calls">
                    {callLogs.length === 0 ? (
                        <EmptyState
                            message="No call logs found"
                            icon={<Phone className="w-12 h-12 text-dark-400" />}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-dark-400 text-sm border-b border-dark-800">
                                        <th className="pb-3">Call ID</th>
                                        <th className="pb-3">Phone</th>
                                        <th className="pb-3">Agent</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Duration</th>
                                        <th className="pb-3">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {callLogs.slice(0, 15).map((call) => (
                                        <tr key={call.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                                            <td className="py-3 pr-4 font-mono text-xs text-dark-300">
                                                {call.call_sid?.substring(0, 12) || call.id}...
                                            </td>
                                            <td className="py-3 pr-4">{call.caller_phone || 'Unknown'}</td>
                                            <td className="py-3 pr-4">
                                                <span className="px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400">
                                                    {call.last_agent || 'None'}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusClass(call.status)}`}>
                                                    {getStatusIcon(call.status)}
                                                    {call.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-dark-300">
                                                {formatDuration(call.duration_seconds || 0)}
                                            </td>
                                            <td className="py-3 text-dark-400">
                                                {call.created_at ? new Date(call.created_at).toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
