import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';
import {
    CalendarIcon,
    CurrencyDollarIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';

export default function AdminDashboard() {
    const { data: overview, isLoading } = useQuery({
        queryKey: ['dashboard-overview'],
        queryFn: () => dashboardService.getOverview(),
    });

    const { data: revenue } = useQuery({
        queryKey: ['dashboard-revenue'],
        queryFn: () => dashboardService.getRevenue('month'),
    });

    const { data: appointmentStats } = useQuery({
        queryKey: ['dashboard-appointments'],
        queryFn: () => dashboardService.getAppointmentStats('week'),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const stats = [
        {
            name: 'Total Appointments',
            value: overview?.totalAppointments || 0,
            icon: CalendarIcon,
            color: 'bg-blue-500',
        },
        {
            name: "Today's Appointments",
            value: overview?.todayAppointments || 0,
            icon: CalendarIcon,
            color: 'bg-green-500',
        },
        {
            name: 'Total Revenue',
            value: `$${(overview?.totalRevenue || 0).toLocaleString()}`,
            icon: CurrencyDollarIcon,
            color: 'bg-yellow-500',
        },
        {
            name: 'Total Customers',
            value: overview?.totalCustomers || 0,
            icon: UsersIcon,
            color: 'bg-purple-500',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Overview of your salon performance</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${stat.color}`}>
                                <stat.icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{stat.name}</p>
                                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenue?.data || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Appointments Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Appointments This Week</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={appointmentStats?.byDay || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Appointment Status */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Appointment Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {overview?.appointmentsByStatus?.map((item) => (
                        <div key={item.status} className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                            <p className="text-sm text-gray-500 capitalize">{item.status.replace('_', ' ')}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
