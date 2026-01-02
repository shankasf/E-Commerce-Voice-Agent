import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment.service';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-orange-100 text-orange-800',
};

export default function AdminAppointments() {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [statusFilter, setStatusFilter] = useState('');
    const queryClient = useQueryClient();

    const { data: appointments, isLoading } = useQuery({
        queryKey: ['appointments', selectedDate, statusFilter],
        queryFn: () => appointmentService.getAll({
            date: selectedDate,
            status: statusFilter || undefined,
        }),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            appointmentService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Status updated');
        },
        onError: () => {
            toast.error('Failed to update status');
        },
    });

    const handleStatusChange = (appointment: any, newStatus: string) => {
        const id = appointment.appointment_id || appointment.id;
        updateStatusMutation.mutate({ id: String(id), status: newStatus });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                    <p className="text-gray-500">Manage salon appointments</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : !appointments || appointments.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                    <p className="text-gray-500">No appointments found for this date</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Reference
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Service
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Stylist
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {appointments?.map((appointment: any) => (
                                <tr key={appointment.appointment_id || appointment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-mono text-sm">{appointment.booking_reference}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {appointment.customer?.user?.full_name || `${appointment.customer?.first_name || ''} ${appointment.customer?.last_name || ''}`}
                                            </p>
                                            <p className="text-sm text-gray-500">{appointment.customer?.user?.phone || appointment.customer?.phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-gray-900">
                                            {appointment.services?.[0]?.service?.service_name || appointment.service?.name || '-'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-gray-900">{appointment.stylist?.full_name || appointment.stylist?.name || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-gray-900">
                                            {appointment.start_time} - {appointment.end_time}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={appointment.status}
                                            onChange={(e) => handleStatusChange(appointment, e.target.value)}
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[appointment.status] || 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            <option value="scheduled">Scheduled</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                            <option value="no_show">No Show</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-medium">${appointment.total_amount || 0}</span>
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
