import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment.service';
import { format, isAfter, isBefore } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-orange-100 text-orange-800',
};

export default function MyAppointments() {
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [rescheduleId, setRescheduleId] = useState<string | null>(null);
    const [rescheduleData, setRescheduleData] = useState({
        appointmentDate: '',
        startTime: '',
    });
    const queryClient = useQueryClient();

    const { data: appointments, isLoading } = useQuery({
        queryKey: ['my-appointments'],
        queryFn: () => appointmentService.getMyAppointments(),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => appointmentService.cancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
            toast.success('Appointment cancelled');
        },
        onError: () => toast.error('Failed to cancel appointment'),
    });

    const rescheduleMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: typeof rescheduleData }) =>
            appointmentService.reschedule(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
            toast.success('Appointment rescheduled');
            setRescheduleId(null);
        },
        onError: () => toast.error('Failed to reschedule appointment'),
    });

    const now = new Date();
    const upcomingAppointments = appointments?.filter(
        (apt) => isAfter(new Date(apt.appointment_date), now) && apt.status !== 'cancelled'
    );
    const pastAppointments = appointments?.filter(
        (apt) => isBefore(new Date(apt.appointment_date), now) || apt.status === 'cancelled'
    );

    const displayedAppointments = tab === 'upcoming' ? upcomingAppointments : pastAppointments;

    const handleCancel = (id: string) => {
        if (confirm('Are you sure you want to cancel this appointment?')) {
            cancelMutation.mutate(id);
        }
    };

    const handleReschedule = (id: string) => {
        rescheduleMutation.mutate({ id, data: rescheduleData });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
                <p className="text-gray-500">View and manage your bookings</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTab('upcoming')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'upcoming'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Upcoming ({upcomingAppointments?.length || 0})
                </button>
                <button
                    onClick={() => setTab('past')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'past'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Past ({pastAppointments?.length || 0})
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : displayedAppointments?.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                    <p className="text-gray-500">
                        {tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayedAppointments?.map((apt) => (
                        <div key={apt.id} className="bg-white rounded-xl p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {apt.service?.name}
                                        </h3>
                                        <span className={`px-2 py-1 rounded-full text-xs ${statusColors[apt.status]}`}>
                                            {apt.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 mt-1">with {apt.stylist?.name}</p>
                                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                        <span>
                                            📅 {format(new Date(apt.appointment_date), 'EEEE, MMMM d, yyyy')}
                                        </span>
                                        <span>
                                            ⏰ {apt.start_time} - {apt.end_time}
                                        </span>
                                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                                            {apt.booking_reference}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <p className="text-xl font-bold text-gray-900">${apt.total_amount}</p>
                                    {tab === 'upcoming' && apt.status !== 'cancelled' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setRescheduleId(apt.id)}
                                                className="px-3 py-1 text-sm border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
                                            >
                                                Reschedule
                                            </button>
                                            <button
                                                onClick={() => handleCancel(apt.id)}
                                                className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reschedule form */}
                            {rescheduleId === apt.id && (
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="font-medium mb-3">Reschedule Appointment</h4>
                                    <div className="flex flex-wrap gap-3">
                                        <input
                                            type="date"
                                            value={rescheduleData.appointmentDate}
                                            onChange={(e) =>
                                                setRescheduleData({ ...rescheduleData, appointmentDate: e.target.value })
                                            }
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                        <input
                                            type="time"
                                            value={rescheduleData.startTime}
                                            onChange={(e) =>
                                                setRescheduleData({ ...rescheduleData, startTime: e.target.value })
                                            }
                                            className="px-3 py-2 border rounded-lg"
                                        />
                                        <button
                                            onClick={() => handleReschedule(apt.id)}
                                            disabled={!rescheduleData.appointmentDate || !rescheduleData.startTime}
                                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setRescheduleId(null)}
                                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
