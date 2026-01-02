import api from './api';
import { Customer } from '@/types';

// Transform backend response (snake_case IDs) to frontend (id)
const transformCustomer = (customer: any): Customer => ({
  ...customer,
  id: customer.id || String(customer.customer_id),
  first_name: customer.first_name || customer.user?.first_name || '',
  last_name: customer.last_name || customer.user?.last_name || '',
  email: customer.email || customer.user?.email || '',
  phone: customer.phone || customer.user?.phone,
});

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const response = await api.get<any[]>('/customers');
    return response.data.map(transformCustomer);
  },

  async getById(id: string): Promise<Customer> {
    const response = await api.get<any>(`/customers/${id}`);
    return transformCustomer(response.data);
  },

  async getMyProfile(): Promise<Customer> {
    const response = await api.get<any>('/customers/me');
    return transformCustomer(response.data);
  },

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    notes?: string;
  }): Promise<Customer> {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  },

  async update(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    notes?: string;
    favoriteStylistId?: string;
    favoriteServices?: string[];
  }>): Promise<Customer> {
    const response = await api.patch<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  async updateMyProfile(data: Partial<{
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
  }>): Promise<Customer> {
    const response = await api.patch<Customer>('/customers/me', data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  async getStats(id: string): Promise<{
    totalVisits: number;
    totalSpent: number;
    loyaltyPoints: number;
    lastVisit?: string;
  }> {
    const response = await api.get(`/customers/${id}/stats`);
    return response.data;
  },
};
