import api from './api';
import { Service, ServiceCategory } from '@/types';

// Transform backend response (snake_case IDs) to frontend (id)
const transformService = (service: any): Service => ({
  ...service,
  id: service.id || String(service.service_id),
  category_id: service.category_id,
  category: service.category ? {
    ...service.category,
    id: service.category.id || String(service.category.category_id),
  } : undefined,
});

const transformCategory = (category: any): ServiceCategory => ({
  ...category,
  id: category.id || String(category.category_id),
  services: category.services?.map(transformService),
});

export const serviceService = {
  async getAll(): Promise<Service[]> {
    const response = await api.get<any[]>('/services');
    return response.data.map(transformService);
  },

  async getActive(): Promise<Service[]> {
    // Use getAll since backend already filters to active services
    const response = await api.get<any[]>('/services');
    return response.data.map(transformService).filter(s => s.is_active !== false);
  },

  async getById(id: string): Promise<Service> {
    const response = await api.get<any>(`/services/${id}`);
    return transformService(response.data);
  },

  async create(data: {
    categoryId: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
  }): Promise<Service> {
    const response = await api.post<Service>('/services', data);
    return response.data;
  },

  async update(id: string, data: Partial<{
    categoryId: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    isActive: boolean;
  }>): Promise<Service> {
    const response = await api.patch<Service>(`/services/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/services/${id}`);
  },

  async getCategories(): Promise<ServiceCategory[]> {
    const response = await api.get<any[]>('/services/categories');
    return response.data.map(transformCategory);
  },

  async createCategory(data: {
    name: string;
    description?: string;
    displayOrder?: number;
  }): Promise<ServiceCategory> {
    const response = await api.post<ServiceCategory>('/services/categories', data);
    return response.data;
  },
};
