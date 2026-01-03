import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceService } from '@/services/service.service';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Service } from '@/types';

export default function AdminServices() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({
        categoryId: '',
        name: '',
        description: '',
        durationMinutes: 30,
        price: 0,
    });
    const queryClient = useQueryClient();

    const { data: services, isLoading } = useQuery({
        queryKey: ['services'],
        queryFn: () => serviceService.getAll(),
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => serviceService.getCategories(),
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => serviceService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            toast.success('Service created');
            closeModal();
        },
        onError: () => toast.error('Failed to create service'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
            serviceService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            toast.success('Service updated');
            closeModal();
        },
        onError: () => toast.error('Failed to update service'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => serviceService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            toast.success('Service deleted');
        },
        onError: () => toast.error('Failed to delete service'),
    });

    const openModal = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData({
                categoryId: service.category_id,
                name: service.name,
                description: service.description || '',
                durationMinutes: service.duration_minutes,
                price: service.price,
            });
        } else {
            setEditingService(null);
            setFormData({
                categoryId: categories?.[0]?.id || '',
                name: '',
                description: '',
                durationMinutes: 30,
                price: 0,
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingService(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingService) {
            updateMutation.mutate({ id: editingService.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this service?')) {
            deleteMutation.mutate(id);
        }
    };

    // Group services by category
    const groupedServices = services?.reduce((acc, service) => {
        const categoryName = service.category?.name || 'Uncategorized';
        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(service);
        return acc;
    }, {} as Record<string, Service[]>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Services</h1>
                    <p className="text-gray-500">Manage salon services and pricing</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                    <PlusIcon className="h-5 w-5" />
                    Add Service
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedServices || {}).map(([category, categoryServices]) => (
                        <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b">
                                <h3 className="font-semibold text-gray-900">{category}</h3>
                            </div>
                            <div className="divide-y">
                                {categoryServices.map((service) => (
                                    <div key={service.id} className="px-6 py-4 flex items-center justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                                            <p className="text-sm text-gray-500">{service.description}</p>
                                            <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                                <span>{service.duration_minutes} min</span>
                                                <span className="font-medium text-gray-900">${service.price}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${service.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {service.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <button
                                                onClick={() => openModal(service)}
                                                className="p-2 text-gray-400 hover:text-gray-600"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2 text-gray-400 hover:text-red-600"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
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
                            {editingService ? 'Edit Service' : 'Add Service'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    {categories?.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration (min)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.durationMinutes}
                                        onChange={(e) =>
                                            setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })
                                        }
                                        required
                                        min={5}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) =>
                                            setFormData({ ...formData, price: parseFloat(e.target.value) })
                                        }
                                        required
                                        min={0}
                                        step={0.01}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
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
                                    {editingService ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
