import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../components/layout';
import { MetricCard, StatCard, Card, LoadingSpinner } from '../components/common';
import { DeviceStatusChart, OSDistributionChart, TicketsByPriorityChart } from '../components/dashboard/Charts';
import { dashboardApi } from '../services/api';
import { useRealtimeUpdates } from '../services/useRealtime';

export function OverviewPage() {
    // Real-time updates - auto invalidates queries on WebSocket events
    useRealtimeUpdates();

    const { data: overview, isLoading: loadingOverview, refetch } = useQuery({
        queryKey: ['dashboard-overview'],
        queryFn: () => dashboardApi.getOverview(),
    });

    const { data: devices, isLoading: loadingDevices } = useQuery({
        queryKey: ['dashboard-devices'],
        queryFn: () => dashboardApi.getDevices(),
    });

    const { data: tickets, isLoading: loadingTickets } = useQuery({
        queryKey: ['dashboard-tickets'],
        queryFn: () => dashboardApi.getTickets(),
    });

    const isLoading = loadingOverview || loadingDevices || loadingTickets;
    const metrics = overview?.metrics;
    const deviceMetrics = devices?.metrics;
    const ticketMetrics = tickets?.metrics;

    if (isLoading) {
        return (
            <DashboardLayout
                title="Dashboard Overview"
                subtitle="Real-time analytics for your voice support system"
            >
                <LoadingSpinner size="lg" />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Dashboard Overview"
            subtitle="Real-time analytics for your voice support system"
            onRefresh={() => refetch()}
        >
            <div className="fade-in space-y-6">
                {/* Device Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <MetricCard
                        label="Total Devices"
                        value={metrics?.total_devices || deviceMetrics?.total_devices || 0}
                        icon="monitor"
                        color="primary"
                    />
                    <MetricCard
                        label="Online"
                        value={metrics?.online_devices || deviceMetrics?.online_devices || 0}
                        icon="check-circle"
                        color="green"
                    />
                    <MetricCard
                        label="Offline"
                        value={metrics?.offline_devices || deviceMetrics?.offline_devices || 0}
                        icon="x"
                        color="red"
                    />
                    <MetricCard
                        label="Organizations"
                        value={metrics?.total_organizations || 0}
                        icon="users"
                        color="blue"
                    />
                    <MetricCard
                        label="Contacts"
                        value={metrics?.total_contacts || 0}
                        icon="user-plus"
                        color="purple"
                    />
                    <MetricCard
                        label="Locations"
                        value={metrics?.total_locations || 0}
                        icon="target"
                        color="orange"
                    />
                </div>

                {/* Call Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <MetricCard
                        label="Total Calls"
                        value={metrics?.total_calls || 0}
                        icon="phone"
                        color="primary"
                    />
                    <MetricCard
                        label="Completed"
                        value={metrics?.completed_calls || 0}
                        icon="check"
                        color="green"
                    />
                    <MetricCard
                        label="Avg Duration"
                        value={`${Math.round(metrics?.avg_call_duration_seconds || 0)}s`}
                        icon="clock"
                        color="blue"
                    />
                    <MetricCard
                        label="AI Resolution"
                        value={`${metrics?.ai_resolution_rate_percent || 0}%`}
                        icon="zap"
                        color="purple"
                    />
                    <MetricCard
                        label="Active Sessions"
                        value={metrics?.active_sessions || 0}
                        icon="activity"
                        color="yellow"
                    />
                    <MetricCard
                        label="Tokens Today"
                        value={metrics?.total_tokens_today?.toLocaleString() || 0}
                        icon="cpu"
                        color="orange"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DeviceStatusChart
                        title="Device Status by Organization"
                        data={deviceMetrics?.devices_by_org || []}
                    />
                    <OSDistributionChart
                        title="OS Distribution"
                        data={deviceMetrics?.devices_by_os || []}
                    />
                </div>

                {/* Third Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <TicketsByPriorityChart
                        title="Tickets by Priority"
                        data={ticketMetrics?.tickets_by_priority || []}
                    />

                    <Card title="Recent Devices">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-dark-400 text-sm">
                                        <th className="pb-3">Organization</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Devices</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {(deviceMetrics?.devices_by_org || []).slice(0, 5).map((org, idx) => (
                                        <tr key={idx} className="border-b border-dark-800">
                                            <td className="py-3 pr-4 font-medium max-w-[150px] truncate">
                                                {org.organization}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${org.online > 0
                                                            ? 'bg-green-600/20 text-green-400'
                                                            : 'bg-red-600/20 text-red-400'
                                                        }`}
                                                >
                                                    {org.online || 0} online
                                                </span>
                                            </td>
                                            <td className="py-3 text-dark-400">{org.device_count}</td>
                                        </tr>
                                    ))}
                                    {(!deviceMetrics?.devices_by_org || deviceMetrics.devices_by_org.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="py-4 text-dark-400 text-center">
                                                No device data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card title="Quick Stats">
                        <div className="space-y-4">
                            <StatCard
                                label="Open Tickets"
                                value={ticketMetrics?.open_tickets || 0}
                                subtitle="Needs attention"
                                color="yellow"
                            />
                            <StatCard
                                label="Resolved Today"
                                value={ticketMetrics?.resolved_tickets || 0}
                                subtitle="Completed"
                                color="green"
                            />
                            <StatCard
                                label="SLA Compliance"
                                value={`${ticketMetrics?.sla_compliance_percent || 0}%`}
                                subtitle="Target: 95%"
                                color={
                                    (ticketMetrics?.sla_compliance_percent || 0) >= 95
                                        ? 'green'
                                        : 'red'
                                }
                            />
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
