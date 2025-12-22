import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import { ArrowLeft, Save, AlertTriangle, Monitor, FileText, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const NewTicket = () => {
    const navigate = useNavigate();

    // Form State
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Low');
    const [deviceId, setDeviceId] = useState('');

    // Data State
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // 1. Fetch Devices on Load
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const res = await api.get('/devices/my-devices');
                setDevices(res.data);
                if (res.data.length > 0) {
                    setDeviceId(res.data[0].id);
                }
            } catch (err) {
                console.error("Failed to load devices", err);
                setError("Could not load your devices.");
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, []);

    // 2. Auto-detect Priority
    useEffect(() => {
        const lowerDesc = description.toLowerCase();
        const highKeywords = ['system down', 'crash', 'critical', 'urgent', 'broken', 'failure'];
        const mediumKeywords = ['slow', 'lag', 'bug', 'glitch'];

        if (highKeywords.some(keyword => lowerDesc.includes(keyword))) {
            setPriority('High');
        } else if (mediumKeywords.some(keyword => lowerDesc.includes(keyword))) {
            setPriority('Medium');
        }
    }, [description]);

    // 3. Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const priorityMap = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
            await api.post('/tickets', {
                device_id: deviceId,
                subject,
                description,
                priority_id: priorityMap[priority]
            });
            navigate('/dashboard');
        } catch (err) {
            setError("Failed to create ticket. Please try again.");
            console.error(err);
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading...</div>;

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mr-4 p-2 bg-white rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-gray-100 shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">New Support Request</h1>
                        <p className="text-gray-500 text-sm">Submit a new ticket and we will get back to you shortly.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Progress / Steps Visual (Decorative) */}
                    <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-2 text-sm">
                        <span className="flex items-center text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full">
                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-2">1</span>
                            Ticket Details
                        </span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-400 font-medium">Auto-Triage</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-400 font-medium">Submission</span>
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-200 flex items-center">
                                <AlertTriangle size={18} className="mr-2" /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Section 1: Asset Info */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    <Monitor size={20} className="mr-2 text-blue-500" /> Affected Asset
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Device</label>
                                        <div className="relative">
                                            <select
                                                value={deviceId}
                                                onChange={(e) => setDeviceId(e.target.value)}
                                                className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                                required
                                            >
                                                <option value="">Select a device...</option>
                                                {devices.map(dev => (
                                                    <option key={dev.id} value={dev.id}>{dev.model} ({dev.name})</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:block bg-blue-50 rounded-xl p-4 border border-blue-100">
                                        <p className="text-xs text-blue-800 font-semibold mb-1">Why do we need this?</p>
                                        <p className="text-xs text-blue-600 leading-relaxed">Selecting the correct device helps our AI diagnose specific hardware or software issues faster.</p>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Section 2: Issue Details */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    <FileText size={20} className="mr-2 text-indigo-500" /> Issue Details
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
                                            placeholder="Brief summary of the issue..."
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows="5"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm leading-relaxed"
                                            placeholder="Please provide as much detail as possible..."
                                            required
                                        />
                                    </div>

                                    {/* Priority Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Priority Level</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPriority(p)}
                                                    className={`relative py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center ${priority === p
                                                        ? p === 'Critical' ? 'border-red-500 bg-red-50 text-red-600' :
                                                            p === 'High' ? 'border-orange-500 bg-orange-50 text-orange-600' :
                                                                'border-blue-600 bg-blue-50 text-blue-600'
                                                        : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {p}
                                                    {priority === p && (
                                                        <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-white rounded-full p-0.5 border shadow-sm">
                                                            <Check size={12} className={p === 'Critical' ? 'text-red-500' : 'text-blue-600'} />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs text-gray-400 text-right italic">* Priority is auto-detected but can be adjusted.</p>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/dashboard')}
                                    className="mr-4 px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-gray-500/20 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                                >
                                    {submitting ? 'Submitting...' : <><Save size={18} className="mr-2" /> Submit Ticket</>}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default NewTicket;