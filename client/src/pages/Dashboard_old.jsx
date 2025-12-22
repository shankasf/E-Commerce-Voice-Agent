import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/authcontext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Laptop, Smartphone, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
//import ChatBubble from '../components/ChatBubble';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Devices and Tickets in parallel
                const [deviceRes, ticketRes] = await Promise.all([
                    api.get(`/devices/my-devices?history=${showHistory}`),
                    api.get('/tickets')
                ]);

                setDevices(deviceRes.data);
                setTickets(ticketRes.data);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

    }, [showHistory]);

    const getStatusColor = (status) => {
        return status === 'ONLINE' ? 'text-green-600' : 'text-gray-400';
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* SECTION 1: MY DEVICES */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                            <Laptop className="mr-2" /> My Workspace
                        </h2>

                        <label className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showHistory} onChange={() => setShowHistory(!showHistory)} />
                                <div className={`block w-10 h-6 rounded-full ${showHistory ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${showHistory ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <div className="ml-3 text-gray-700 font-medium text-sm">Show History</div>
                        </label>
                    </div>

                    {devices.length === 0 ? (
                        <p className="text-gray-500 italic">No devices assigned.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {devices.map((device) => (
                                <div key={device.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-lg ${device.name.toLowerCase().includes('phone') ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {device.name.toLowerCase().includes('phone') ? <Smartphone size={24} /> : <Laptop size={24} />}
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${device.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {device.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800">{device.model}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{device.name}</p>
                                    <div className="text-xs text-gray-400 border-t pt-3 mt-3">
                                        OS: {device.os}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SECTION 2: RECENT TICKETS */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                            <AlertCircle className="mr-2" /> Recent Tickets
                        </h2>
                        <button onClick={() => navigate('/new-ticket')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                            + New Ticket
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {tickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">You have no open tickets. Great!</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tickets.map((ticket) => (
                                        <tr key={ticket.id} onClick={() => navigate(`/ticket/${ticket.id}`)} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                                                <div className="text-xs text-gray-500">{ticket.device}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {ticket.priority}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Dashboard;