import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';
import api from '../services/api';
import Layout from '../components/Layout';
import {
    Laptop, AlertTriangle, CheckCircle2, Clock,
    ArrowUpRight, Plus, Activity, Server, Database, Wifi,
    Ticket, AlertCircle, CheckCircle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
    BarChart, Bar, Legend
} from 'recharts';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
    >
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 opacity-50`} />
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                <Icon size={24} />
            </div>
            {trend && (
                <div className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                    <ArrowUpRight size={14} className="mr-1" />
                    {trend}
                </div>
            )}
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-1">{value}</h3>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
    </motion.div>
);

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, critical: 0, devices: 0 });
    const [tickets, setTickets] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [systemHealth, setSystemHealth] = useState({ db: 'checking', server: 'checking', ai: 'operational' });

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dRes, tRes] = await Promise.all([
                    api.get('/devices/my-devices'),
                    api.get('/tickets')
                ]);

                const tList = tRes.data;
                setTickets(tList);

                // Real Stats
                const openCount = tList.filter(t => t.status === 'Open').length;
                const closedCount = tList.filter(t => t.status === 'Closed').length;
                const criticalCount = tList.filter(t => t.priority === 'Critical').length;

                setStats({
                    total: tList.length,
                    open: openCount,
                    resolved: closedCount,
                    critical: criticalCount,
                    devices: dRes.data.length
                });

                // Real Pie Data
                setPieData([
                    { name: 'Open', value: openCount, color: '#F59E0B' }, // Yellow
                    { name: 'Closed', value: closedCount, color: '#10B981' }, // Green
                    { name: 'Critical', value: criticalCount, color: '#EF4444' }, // Red
                ]);

                // Real Weekly Activity (Last 7 Days)
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0]; // YYYY-MM-DD
                }).reverse();

                const activityData = last7Days.map(date => ({
                    name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    tickets: tList.filter(t => t.created_at.startsWith(date)).length
                }));
                setChartData(activityData);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

    }, []);

    // Get Recent Activity (Top 5 newest tickets)
    // We sort a copy so we don't mutate original tickets
    const recentActivity = [...tickets]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading Dashboard...</div>;

    return (
        <Layout>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Tickets"
                    value={stats.total}
                    icon={Ticket}
                    color="blue"
                    trend="+12%"
                />
                <StatCard
                    title="Open Tickets"
                    value={stats.open}
                    icon={AlertCircle}
                    color="yellow"
                    trend={stats.open > 5 ? "High Load" : "Normal"}
                />
                <StatCard
                    title="Resolved"
                    value={stats.resolved}
                    icon={CheckCircle}
                    color="green"
                />
                <StatCard
                    title="Avg Response"
                    value="1.2h"
                    icon={Clock}
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Weekly Activity</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#F3F4F6' }}
                                />
                                <Bar dataKey="tickets" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 w-full text-left">Status Distribution</h3>
                    <div className="w-full h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label for Donut Chart */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                            <span className="text-3xl font-bold text-gray-800">{stats.total}</span>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tickets</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/new-ticket')}
                        className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-all transform hover:scale-[1.02] shadow-lg shadow-gray-900/10"
                    >
                        <Plus size={20} className="mr-2" /> Create New Ticket
                    </button>
                </div>
            </div>

            {/* Widgets Row (New) */}
            <div className="grid grid-cols-1 mb-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No recent activity found.</p>
                        ) : (
                            recentActivity.map((ticket) => (
                                <div key={ticket.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                    <div className={`mt-1 p-2 rounded-full ${ticket.status === 'Open' ? 'bg-yellow-100 text-yellow-600' :
                                        ticket.status === 'Closed' ? 'bg-green-100 text-green-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        <Activity size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            Ticket <span className="text-blue-600">#{ticket.id}</span> created
                                        </p>
                                        <p className="text-xs text-gray-500 truncate max-w-md">{ticket.subject}</p>
                                    </div>
                                    <div className="text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Tickets Table (Existing) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Recent Tickets</h3>
                    <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
                </div>
                <table className="w-full">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tickets.slice(0, 5).map((ticket) => (
                            <tr
                                key={ticket.id}
                                onClick={() => navigate(`/tickets/${ticket.id}`)}
                                className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{ticket.subject}</div>
                                    <div className="text-xs text-gray-500">{ticket.device}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${ticket.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                                        ticket.status === 'Closed' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {ticket.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${ticket.priority === 'Critical' ? 'bg-red-500' :
                                            ticket.priority === 'High' ? 'bg-orange-500' : 'bg-blue-400'
                                            }`}></div>
                                        <span className="text-sm text-gray-600 font-medium">{ticket.priority}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">View Details &rarr;</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Layout>
    );
};

export default Dashboard;