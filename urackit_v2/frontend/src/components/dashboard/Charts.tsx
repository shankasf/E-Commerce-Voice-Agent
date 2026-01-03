import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area,
    Legend,
} from 'recharts';
import { Card, EmptyState } from '../common';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

interface ChartProps {
    title: string;
    data: any[];
    height?: number;
}

export function HourlyCallsChart({ title, data, height = 300 }: ChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card title={title}>
                <EmptyState message="No call data available" />
            </Card>
        );
    }

    const formattedData = data.map((d) => ({
        ...d,
        hour: `${d.hour}:00`,
    }));

    return (
        <Card title={title}>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#06b6d4"
                            fill="url(#colorCalls)"
                            strokeWidth={2}
                        />
                        <defs>
                            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export function AgentDistributionChart({ title, data, height = 300 }: ChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card title={title}>
                <EmptyState message="No agent data available" />
            </Card>
        );
    }

    return (
        <Card title={title}>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="agent_type"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={false}
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export function DeviceStatusChart({ title, data, height = 300 }: ChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card title={title}>
                <EmptyState message="No device data available" />
            </Card>
        );
    }

    return (
        <Card title={title}>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis
                            dataKey="organization"
                            type="category"
                            stroke="#94a3b8"
                            fontSize={11}
                            width={100}
                            tickFormatter={(value) =>
                                value.length > 12 ? `${value.substring(0, 12)}...` : value
                            }
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                            }}
                        />
                        <Legend />
                        <Bar dataKey="online" stackId="a" fill="#10b981" name="Online" />
                        <Bar dataKey="offline" stackId="a" fill="#ef4444" name="Offline" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export function OSDistributionChart({ title, data, height = 300 }: ChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card title={title}>
                <EmptyState message="No OS data available" />
            </Card>
        );
    }

    return (
        <Card title={title}>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="os_name"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export function TicketsByPriorityChart({ title, data, height = 300 }: ChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card title={title}>
                <EmptyState message="No ticket data available" />
            </Card>
        );
    }

    const priorityColors: Record<string, string> = {
        Critical: '#ef4444',
        High: '#f59e0b',
        Medium: '#3b82f6',
        Low: '#10b981',
    };

    return (
        <Card title={title}>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="priority" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                            }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={priorityColors[entry.priority] || '#3b82f6'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export function CostTrendChart({ title, data, height = 300 }: ChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card title={title}>
                <EmptyState message="No cost data available" />
            </Card>
        );
    }

    return (
        <Card title={title}>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                            }}
                            formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, 'Cost']}
                        />
                        <Line
                            type="monotone"
                            dataKey="cost"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ fill: '#8b5cf6', r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
