import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { serviceService } from '@/services/service.service';
import { stylistService } from '@/services/stylist.service';
import { appointmentService } from '@/services/appointment.service';
import { customerService } from '@/services/customer.service';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { CheckIcon } from '@heroicons/react/24/outline';

type Step = 'service' | 'stylist' | 'datetime' | 'confirm';

export default function BookAppointment() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('service');
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const { data: services } = useQuery({
        queryKey: ['active-services'],
        queryFn: () => serviceService.getActive(),
    });

    const { data: stylists } = useQuery({
        queryKey: ['available-stylists'],
        queryFn: () => stylistService.getAvailable(),
    });

    const { data: profile } = useQuery({
        queryKey: ['my-profile'],
        queryFn: () => customerService.getMyProfile(),
    });

    const { data: availableSlots } = useQuery({
        queryKey: ['available-slots', selectedStylist, selectedService, selectedDate],
        queryFn: () =>
            appointmentService.getAvailableSlots({
                stylistId: selectedStylist!,
                serviceId: selectedService!,
                date: selectedDate,
            }),
        enabled: !!selectedStylist && !!selectedService && !!selectedDate,
    });

    const bookMutation = useMutation({
        mutationFn: (data: {
            customerId: string;
            serviceId: string;
            stylistId: string;
            appointmentDate: string;
            startTime: string;
            notes?: string;
        }) => appointmentService.create(data),
        onSuccess: (data) => {
            toast.success(`Appointment booked! Reference: ${data.booking_reference}`);
            navigate('/dashboard/appointments');
        },
        onError: () => toast.error('Failed to book appointment'),
    });

    const selectedServiceData = services?.find((s) => s.id === selectedService);
    const selectedStylistData = stylists?.find((s) => s.id === selectedStylist);

    const handleBook = () => {
        if (!profile || !selectedService || !selectedStylist || !selectedTime) return;

        bookMutation.mutate({
            customerId: profile.id,
            serviceId: selectedService,
            stylistId: selectedStylist,
            appointmentDate: selectedDate,
            startTime: selectedTime,
            notes: notes || undefined,
        });
    };

    const steps = [
        { id: 'service', name: 'Service' },
        { id: 'stylist', name: 'Stylist' },
        { id: 'datetime', name: 'Date & Time' },
        { id: 'confirm', name: 'Confirm' },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === step);

    // Group services by category
    const groupedServices = services?.reduce((acc, service) => {
        const categoryName = service.category?.name || 'Other';
        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(service);
        return acc;
    }, {} as Record<string, typeof services>);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
                <p className="text-gray-500">Choose your service and schedule your visit</p>
            </div>

            {/* Progress steps */}
            <div className="mb-8">
                <div className="flex items-center">
                    {steps.map((s, index) => (
                        <div key={s.id} className="flex items-center flex-1">
                            <div
                                className={`flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 text-sm sm:text-base ${index < currentStepIndex
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : index === currentStepIndex
                                            ? 'border-primary-600 text-primary-600'
                                            : 'border-gray-300 text-gray-300'
                                    }`}
                            >
                                {index < currentStepIndex ? (
                                    <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`flex-1 h-1 mx-1 sm:mx-2 ${index < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex mt-2">
                    {steps.map((s) => (
                        <div key={s.id} className="flex-1 text-center text-xs sm:text-sm text-gray-500">
                            <span className="hidden sm:inline">{s.name}</span>
                            <span className="sm:hidden">{s.name.split(' ')[0]}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                {/* Step 1: Select Service */}
                {step === 'service' && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Select a Service</h2>
                        <div className="space-y-6">
                            {Object.entries(groupedServices || {}).map(([category, categoryServices]) => (
                                <div key={category}>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
                                    <div className="space-y-2">
                                        {categoryServices?.map((service) => (
                                            <button
                                                key={service.id}
                                                onClick={() => setSelectedService(service.id)}
                                                className={`w-full p-4 text-left rounded-lg border-2 transition ${selectedService === service.id
                                                        ? 'border-primary-600 bg-primary-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{service.name}</p>
                                                        <p className="text-sm text-gray-500">{service.description}</p>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {service.duration_minutes} min
                                                        </p>
                                                    </div>
                                                    <p className="text-lg font-semibold text-gray-900">${service.price}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setStep('stylist')}
                                disabled={!selectedService}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Stylist */}
                {step === 'stylist' && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Choose a Stylist</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stylists?.map((stylist) => (
                                <button
                                    key={stylist.id}
                                    onClick={() => setSelectedStylist(stylist.id)}
                                    className={`p-4 text-left rounded-lg border-2 transition ${selectedStylist === stylist.id
                                            ? 'border-primary-600 bg-primary-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                                            <span className="text-primary-600 font-medium">{stylist.name[0]}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{stylist.name}</p>
                                            {stylist.specializations?.length > 0 && (
                                                <p className="text-sm text-gray-500">
                                                    {stylist.specializations.slice(0, 2).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button
                                onClick={() => setStep('service')}
                                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep('datetime')}
                                disabled={!selectedStylist}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Select Date & Time */}
                {step === 'datetime' && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Select Date & Time</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setSelectedTime(null);
                                }}
                                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                                max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                                className="px-4 py-2 border rounded-lg w-full max-w-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Available Time Slots
                            </label>
                            {availableSlots && availableSlots.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {availableSlots.map((slot) => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedTime(slot)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${selectedTime === slot
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No available slots for this date</p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button
                                onClick={() => setStep('stylist')}
                                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep('confirm')}
                                disabled={!selectedTime}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Confirm */}
                {step === 'confirm' && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Confirm Your Booking</h2>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Service</span>
                                <span className="font-medium">{selectedServiceData?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Stylist</span>
                                <span className="font-medium">{selectedStylistData?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Date</span>
                                <span className="font-medium">
                                    {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Time</span>
                                <span className="font-medium">{selectedTime}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Duration</span>
                                <span className="font-medium">{selectedServiceData?.duration_minutes} min</span>
                            </div>
                            <hr />
                            <div className="flex justify-between text-lg">
                                <span className="font-medium">Total</span>
                                <span className="font-bold">${selectedServiceData?.price}</span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes (optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any special requests or notes for your stylist..."
                                className="w-full px-4 py-2 border rounded-lg"
                                rows={3}
                            />
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button
                                onClick={() => setStep('datetime')}
                                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleBook}
                                disabled={bookMutation.isPending}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
