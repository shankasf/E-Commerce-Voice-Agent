import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appointmentService } from '@/services/appointment.service';
import { customerService } from '@/services/customer.service';
import { format, isAfter } from 'date-fns';
import {
    CalendarIcon,
    ClockIcon,
    SparklesIcon,
    StarIcon,
} from '@heroicons/react/24/outline';

export default function CustomerDashboard() {
    const { data: upcomingAppointments } = useQuery({
        queryKey: ['my-upcoming-appointments'],
        queryFn: () => appointmentService.getMyAppointments(),
    });

    const { data: profile } = useQuery({
        queryKey: ['my-profile'],
        queryFn: () => customerService.getMyProfile(),
    });

    const nextAppointment = upcomingAppointments?.find(
        (apt) => isAfter(new Date(apt.appointment_date), new Date()) &&
            apt.status !== 'cancelled'
    );

    return (
        <div className="space-y-6">
            {/* Welcome card */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold">Welcome back! 💅</h1>
                <p className="mt-1 opacity-90">Ready for your next beauty appointment?</p>
                <Link
                    to="/dashboard/book"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition"
                >
                    <CalendarIcon className="h-5 w-5" />
                    Book Appointment
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Next appointment */}
                <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Next Appointment</h2>
                    {nextAppointment ? (
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary-100 rounded-lg">
                                <CalendarIcon className="h-6 w-6 text-primary-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">
                                    {nextAppointment.service?.name}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    with {nextAppointment.stylist?.name}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <CalendarIcon className="h-4 w-4" />
                                        {format(new Date(nextAppointment.appointment_date), 'MMMM d, yyyy')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <ClockIcon className="h-4 w-4" />
                                        {nextAppointment.start_time}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm">
                                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                        {nextAppointment.booking_reference}
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold">${nextAppointment.total_amount}</p>
                                <span
                                    className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${nextAppointment.status === 'confirmed'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                >
                                    {nextAppointment.status}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No upcoming appointments</p>
                            <Link
                                to="/dashboard/book"
                                className="inline-block mt-3 text-primary-600 font-medium hover:underline"
                            >
                                Book your first appointment
                            </Link>
                        </div>
                    )}
                </div>

                {/* Loyalty points */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Your Rewards</h2>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-yellow-100 mb-3">
                            <StarIcon className="h-10 w-10 text-yellow-500" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {profile?.loyalty_points || 0}
                        </p>
                        <p className="text-sm text-gray-500">Loyalty Points</p>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Visits</span>
                            <span className="font-medium">{profile?.total_visits || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-500">Total Spent</span>
                            <span className="font-medium">${profile?.total_spent?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent appointments */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Appointments</h2>
                    <Link
                        to="/dashboard/appointments"
                        className="text-sm text-primary-600 hover:underline"
                    >
                        View all
                    </Link>
                </div>
                {upcomingAppointments && upcomingAppointments.length > 0 ? (
                    <div className="space-y-3">
                        {upcomingAppointments.slice(0, 5).map((apt) => (
                            <div
                                key={apt.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">{apt.service?.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {format(new Date(apt.appointment_date), 'MMM d, yyyy')} at {apt.start_time}
                                    </p>
                                </div>
                                <span
                                    className={`px-2 py-1 rounded-full text-xs ${apt.status === 'completed'
                                            ? 'bg-gray-100 text-gray-600'
                                            : apt.status === 'cancelled'
                                                ? 'bg-red-100 text-red-600'
                                                : apt.status === 'confirmed'
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-blue-100 text-blue-600'
                                        }`}
                                >
                                    {apt.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No appointments yet</p>
                )}
            </div>
        </div>
    );
}
