import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { ArrowLeft, Save } from 'lucide-react';

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

    // 1. Fetch Devices on Load
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const res = await api.get('/devices/my-devices');
                setDevices(res.data);

                // Smart Feature: If user has devices, auto-select the first one
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

    // 2. Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Map priority string to ID (Adjust these IDs if your DB is different!)
            // Low=1, Medium=2, High=3, Critical=4
            const priorityMap = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };

            await api.post('/tickets', {
                device_id: deviceId,
                subject,
                description,
                priority_id: priorityMap[priority]
            });

            navigate('/dashboard'); // Go back to dashboard on success
        } catch (err) {
            setError("Failed to create ticket. Please try again.");
            console.error(err);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-1" /> Back to Dashboard
                </button>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Support Ticket</h1>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Device Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Which device is having issues?</label>
                            <select
                                value={deviceId}
                                onChange={(e) => setDeviceId(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                required
                            >
                                <option value="">Select a device...</option>
                                {devices.map(dev => (
                                    <option key={dev.id} value={dev.id}>
                                        {dev.model} ({dev.name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="e.g., WiFi keeps disconnecting"
                                required
                            />
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`py-2 px-4 rounded-lg text-sm font-medium border transition-all ${priority === p
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="4"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Please describe what happened..."
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center shadow-md"
                        >
                            <Save size={20} className="mr-2" /> Submit Ticket
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default NewTicket;