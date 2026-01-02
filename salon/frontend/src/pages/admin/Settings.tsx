import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        salonName: 'GlamBook Salon',
        email: 'hello@glambook.com',
        phone: '+1 (555) 123-4567',
        address: '123 Beauty Street, New York, NY 10001',
        timezone: 'America/New_York',
        appointmentBuffer: 15,
        maxAdvanceBookingDays: 30,
        cancellationHours: 24,
    });

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast.success('Settings saved successfully');
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage your salon settings</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Information */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Salon Name
                            </label>
                            <input
                                type="text"
                                value={settings.salonName}
                                onChange={(e) => setSettings({ ...settings, salonName: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={settings.email}
                                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={settings.phone}
                                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Timezone
                            </label>
                            <select
                                value={settings.timezone}
                                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="America/New_York">Eastern Time</option>
                                <option value="America/Chicago">Central Time</option>
                                <option value="America/Denver">Mountain Time</option>
                                <option value="America/Los_Angeles">Pacific Time</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address
                            </label>
                            <input
                                type="text"
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Booking Settings */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Booking Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Buffer Between Appointments (min)
                            </label>
                            <input
                                type="number"
                                value={settings.appointmentBuffer}
                                onChange={(e) =>
                                    setSettings({ ...settings, appointmentBuffer: parseInt(e.target.value) })
                                }
                                min={0}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Advance Booking (days)
                            </label>
                            <input
                                type="number"
                                value={settings.maxAdvanceBookingDays}
                                onChange={(e) =>
                                    setSettings({ ...settings, maxAdvanceBookingDays: parseInt(e.target.value) })
                                }
                                min={1}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cancellation Notice (hours)
                            </label>
                            <input
                                type="number"
                                value={settings.cancellationHours}
                                onChange={(e) =>
                                    setSettings({ ...settings, cancellationHours: parseInt(e.target.value) })
                                }
                                min={0}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Voice Agent Settings */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Voice Agent Settings</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">Eleven Labs Voice</p>
                                <p className="text-sm text-gray-500">Voice model: eleven_turbo_v2_5</p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                Active
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">Twilio Integration</p>
                                <p className="text-sm text-gray-500">Phone number: +1 (555) 987-6543</p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                Connected
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
