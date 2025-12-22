import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { Laptop, Monitor, Smartphone, CheckCircle, Wifi, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

const DeviceIcon = ({ type }) => {
    // Simple heuristic for icon
    const t = (type || '').toLowerCase();
    if (t.includes('mobile') || t.includes('phone')) return <Smartphone size={24} className="text-blue-500" />;
    if (t.includes('monitor') || t.includes('display')) return <Monitor size={24} className="text-purple-500" />;
    return <Laptop size={24} className="text-indigo-500" />;
};

const DeviceCard = ({ device }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full group"
    >
        <div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                    <DeviceIcon type={device.description} />
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${device.status === 'RETURNED' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                    }`}>
                    {device.status || 'Active'}
                </span>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-1">{device.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{device.model}</p>

            <div className="space-y-2">
                <div className="flex items-center text-xs text-gray-500">
                    <Cpu size={14} className="mr-2" />
                    <span>{device.os || 'Unknown OS'}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                    <Wifi size={14} className="mr-2" />
                    <span>Serial: {device.serial_number || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-400">Assigned: {new Date().toLocaleDateString()}</span> {/* Placeholder date if assigned_at missing */}
            <button className="text-blue-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                View Specs
            </button>
        </div>
    </motion.div>
);

const MyDevices = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const res = await api.get('/devices/my-devices');
                setDevices(res.data);
            } catch (err) {
                console.error("Failed to fetch devices", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading Assets...</div>;

    return (
        <Layout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Assets</h1>
                    <p className="text-gray-500">Devices assigned to you</p>
                </div>
            </div>

            {devices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {devices.map((device) => (
                        <DeviceCard key={device.id} device={device} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                    <Laptop size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No Devices Assigned</h3>
                    <p className="text-gray-500">Contact IT support if you believe this is an error.</p>
                </div>
            )}
        </Layout>
    );
};

export default MyDevices;
