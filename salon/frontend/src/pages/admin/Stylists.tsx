import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stylistService } from '@/services/stylist.service';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Stylist } from '@/types';

export default function AdminStylists() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        bio: '',
        specializations: [] as string[],
    });
    const queryClient = useQueryClient();

    const { data: stylists, isLoading } = useQuery({
        queryKey: ['stylists'],
        queryFn: () => stylistService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => stylistService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stylists'] });
            toast.success('Stylist added');
            closeModal();
        },
        onError: () => toast.error('Failed to add stylist'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
            stylistService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stylists'] });
            toast.success('Stylist updated');
            closeModal();
        },
        onError: () => toast.error('Failed to update stylist'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => stylistService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stylists'] });
            toast.success('Stylist removed');
        },
        onError: () => toast.error('Failed to remove stylist'),
    });

    const toggleAvailabilityMutation = useMutation({
        mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
            stylistService.update(id, { isAvailable }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stylists'] });
            toast.success('Availability updated');
        },
        onError: () => toast.error('Failed to update availability'),
    });

    const openModal = (stylist?: Stylist) => {
        if (stylist) {
            setEditingStylist(stylist);
            setFormData({
                name: stylist.name,
                email: stylist.email || '',
                phone: stylist.phone || '',
                bio: stylist.bio || '',
                specializations: stylist.specializations || [],
            });
        } else {
            setEditingStylist(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                bio: '',
                specializations: [],
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingStylist(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStylist) {
            updateMutation.mutate({ id: editingStylist.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to remove this stylist?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSpecializationsChange = (value: string) => {
        const specs = value.split(',').map((s) => s.trim()).filter(Boolean);
        setFormData({ ...formData, specializations: specs });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stylists</h1>
                    <p className="text-gray-500">Manage your team of stylists</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                    <PlusIcon className="h-5 w-5" />
                    Add Stylist
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stylists?.map((stylist) => (
                        <div key={stylist.id} className="bg-white rounded-xl p-6 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                                        {stylist.profile_image_url ? (
                                            <img
                                                src={stylist.profile_image_url}
                                                alt={stylist.name}
                                                className="h-12 w-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-primary-600 font-medium text-lg">
                                                {stylist.name[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{stylist.name}</h3>
                                        <p className="text-sm text-gray-500">{stylist.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openModal(stylist)}
                                        className="p-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(stylist.id)}
                                        className="p-2 text-gray-400 hover:text-red-600"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {stylist.bio && (
                                <p className="mt-3 text-sm text-gray-600 line-clamp-2">{stylist.bio}</p>
                            )}

                            {stylist.specializations?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {stylist.specializations.map((spec) => (
                                        <span
                                            key={spec}
                                            className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full"
                                        >
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-sm text-gray-500">{stylist.phone}</span>
                                <button
                                    onClick={() =>
                                        toggleAvailabilityMutation.mutate({
                                            id: stylist.id,
                                            isAvailable: !stylist.is_available,
                                        })
                                    }
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${stylist.is_available
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    {stylist.is_available ? 'Available' : 'Unavailable'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            {editingStylist ? 'Edit Stylist' : 'Add Stylist'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Specializations (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={formData.specializations.join(', ')}
                                    onChange={(e) => handleSpecializationsChange(e.target.value)}
                                    placeholder="Hair Coloring, Balayage, Cuts"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    {editingStylist ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
