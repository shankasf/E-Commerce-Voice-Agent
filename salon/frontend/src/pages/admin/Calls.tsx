import { useQuery } from '@tanstack/react-query';
import { callService } from '@/services/call.service';
import { format } from 'date-fns';
import {
    PhoneArrowDownLeftIcon,
    PhoneArrowUpRightIcon,
} from '@heroicons/react/24/outline';
import { VoiceLogs } from '@/components/VoiceLogs';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8081';

export default function AdminCalls() {
    const { data: calls, isLoading } = useQuery({
        queryKey: ['calls'],
        queryFn: () => callService.getAll(),
    });

    const { data: stats } = useQuery({
        queryKey: ['call-stats'],
        queryFn: () => callService.getStats(),
    });

    const { data: elevenLabsUsage } = useQuery({
        queryKey: ['eleven-labs-usage'],
        queryFn: () => callService.getElevenLabsUsage(),
    });

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
                <p className="text-gray-500">Voice agent call history and analytics</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <p className="text-sm text-gray-500">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalCalls || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <p className="text-sm text-gray-500">Today's Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.todayCalls || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <p className="text-sm text-gray-500">Avg Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatDuration(stats?.avgDuration)}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <p className="text-sm text-gray-500">Eleven Labs Usage</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {elevenLabsUsage?.totalCharacters?.toLocaleString() || 0} chars
                    </p>
                    <p className="text-sm text-gray-500">
                        ${elevenLabsUsage?.totalCost?.toFixed(2) || '0.00'} cost
                    </p>
                </div>
            </div>

            {/* Agent breakdown */}
            {stats?.byAgent && stats.byAgent.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Calls by Agent Type</h3>
                    <div className="flex gap-4">
                        {stats.byAgent.map((item) => (
                            <div key={item.agent} className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                                    {item.agent}: {item.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Realtime Voice Agent Logs */}
            <VoiceLogs
                apiEndpoint={AI_SERVICE_URL}
                maxLogs={200}
                className="max-h-[400px]"
            />

            {/* Call logs table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Direction
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Phone
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Agent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Duration
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Time
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {calls?.map((call) => (
                                <tr key={call.call_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {call.direction === 'inbound' ? (
                                            <PhoneArrowDownLeftIcon className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <PhoneArrowUpRightIcon className="h-5 w-5 text-blue-500" />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-mono text-sm">{call.caller_phone || call.from_number || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {call.customer ? (
                                            <span>
                                                {call.customer.first_name} {call.customer.last_name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Unknown</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                            {call.interactions?.[0]?.agent_type || call.intent_detected || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {formatDuration(call.duration_seconds)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs ${call.status === 'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : call.status === 'failed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {call.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(call.started_at), 'MMM d, yyyy h:mm a')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
