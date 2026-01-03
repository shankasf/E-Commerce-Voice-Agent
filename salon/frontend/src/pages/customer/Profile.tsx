import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/services/customer.service';
import { useAuthStore } from '@/store/authStore';
import { Customer } from '@/types';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        dateOfBirth: '',
    });

    const { data: profile, isLoading } = useQuery<Customer>({
        queryKey: ['my-profile'],
        queryFn: () => customerService.getMyProfile(),
    });

    // Update form data when profile loads
    useEffect(() => {
        if (profile) {
            setFormData({
                firstName: profile.first_name,
                lastName: profile.last_name,
                phone: profile.phone || '',
                dateOfBirth: profile.date_of_birth || '',
            });
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: (data: typeof formData) => customerService.updateMyProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-profile'] });
            toast.success('Profile updated');
            setIsEditing(false);
        },
        onError: () => toast.error('Failed to update profile'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-500">Manage your account information</p>
            </div>

            {/* Profile card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-2xl">
                            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">
                            {profile?.first_name} {profile?.last_name}
                        </h2>
                        <p className="text-gray-500">{user?.email}</p>
                    </div>
                </div>

                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500">First Name</label>
                                <p className="font-medium">{profile?.first_name}</p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500">Last Name</label>
                                <p className="font-medium">{profile?.last_name}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500">Email</label>
                            <p className="font-medium">{profile?.email}</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500">Phone</label>
                            <p className="font-medium">{profile?.phone || 'Not provided'}</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500">Date of Birth</label>
                            <p className="font-medium">{profile?.date_of_birth || 'Not provided'}</p>
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full mt-4 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
                        >
                            Edit Profile
                        </button>
                    </div>
                )}
            </div>

            {/* Stats card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{profile?.total_visits || 0}</p>
                        <p className="text-sm text-gray-500">Total Visits</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                            ${profile?.total_spent?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-gray-500">Total Spent</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{profile?.loyalty_points || 0}</p>
                        <p className="text-sm text-gray-500">Loyalty Points</p>
                    </div>
                </div>
            </div>

            {/* Favorite services */}
            {profile?.favorite_services && profile.favorite_services.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Favorite Services</h3>
                    <div className="flex flex-wrap gap-2">
                        {profile.favorite_services.map((service, index) => (
                            <span
                                key={index}
                                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                            >
                                {service}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
