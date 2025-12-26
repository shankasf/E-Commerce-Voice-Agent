import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import { Plus, Search, Filter } from 'lucide-react';

const MyTickets = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPriority, setFilterPriority] = useState('All');

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await api.get('/tickets');
                setTickets(res.data);
            } catch (err) {
                console.error("Failed to fetch tickets", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, []);

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.id.toString().includes(searchTerm);
        const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
        const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading Tickets...</div>;

    return (
        <Layout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Tickets</h1>
                    <p className="text-gray-500">Manage and track your support requests</p>
                </div>
                <button
                    onClick={() => navigate('/new-ticket')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl flex items-center shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105"
                >
                    <Plus size={20} className="mr-2" /> New Ticket
                </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center space-x-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search tickets by subject or ID..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors relative ${showFilters || filterStatus !== 'All' || filterPriority !== 'All'
                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Filter size={18} />
                        <span>Filter</span>
                        {(filterStatus !== 'All' || filterPriority !== 'All') && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>

                    {/* Filter Dropdown */}
                    {showFilters && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="Open">Open</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Priority</label>
                                    <select
                                        value={filterPriority}
                                        onChange={(e) => setFilterPriority(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="All">All Priorities</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                                <div className="pt-2 border-t border-gray-50 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setFilterStatus('All');
                                            setFilterPriority('All');
                                            setShowFilters(false);
                                        }}
                                        className="text-xs text-red-500 font-bold hover:underline"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Device</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTickets.length > 0 ? (
                            filteredTickets.map((ticket) => (
                                <tr
                                    key={ticket.id}
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">#{ticket.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.subject}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.device || 'N/A'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                                            ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${ticket.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                            ticket.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    No tickets found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Layout>
    );
};

export default MyTickets;
