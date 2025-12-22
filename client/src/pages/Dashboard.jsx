import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';
import api from '../services/api';
import Layout from '../components/Layout';
import FloatingChatBot from '../components/FloatingChatBot';
import {
    Laptop, AlertTriangle, CheckCircle2, Clock,
    ArrowUpRight, Plus
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
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
    const [stats, setStats] = useState({ total: 0, open: 0, critical: 0, devices: 0 });
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock Data for Charts (You can replace with real API data later)
    const chartData = [
        { name: 'Mon', tickets: 2 },
        { name: 'Tue', tickets: 5 },
        { name: 'Wed', tickets: 3 },
        { name: 'Thu', tickets: 8 },
        { name: 'Fri', tickets: 4 },
        { name: 'Sat', tickets: 1 },
        { name: 'Sun', tickets: 2 },
    ];

    const pieData = [
        { name: 'Open', value: 4, color: '#3B82F6' },
        { name: 'Closed', value: 8, color: '#10B981' },
        { name: 'Critical', value: 2, color: '#EF4444' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dRes, tRes] = await Promise.all([
                    api.get('/devices/my-devices'),
                    api.get('/tickets')
                ]);

                const tList = tRes.data;
                setTickets(tList.slice(0, 5)); // Just top 5
                setStats({
                    total: tList.length,
                    open: tList.filter(t => t.status === 'Open').length,
                    critical: tList.filter(t => t.priority === 'Critical').length,
                    devices: dRes.data.length
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading...</div>; // Replace with Skeleton later

    return (
        <Layout>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Tickets" value={stats.total} icon={Clock} color="blue" trend="+12%" />
                <StatCard title="Open Issues" value={stats.open} icon={AlertTriangle} color="yellow" />
                <StatCard title="Critical" value={stats.critical} icon={AlertTriangle} color="red" />
                <StatCard title="Active Assets" value={stats.devices} icon={Laptop} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Weekly Activity</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="tickets" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions / Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 w-full text-left">Status Distribution</h3>
                    <div className="w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <button
                        onClick={() => navigate('/new-ticket')}
                        className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-all transform hover:scale-[1.02]"
                    >
                        <Plus size={20} className="mr-2" /> Create New Ticket
                    </button>
                </div>
            </div>

            {/* Recent Tickets Table */}
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
                        {tickets.map((ticket) => (
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
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${ticket.status === 'Open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
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

            <FloatingChatBot />
        </Layout>
    );
};

export default Dashboard;