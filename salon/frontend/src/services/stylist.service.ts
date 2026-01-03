import api from './api';
import { Stylist, StylistAvailability } from '@/types';

// Transform backend response (snake_case IDs) to frontend (id)
const transformStylist = (stylist: any): Stylist => ({
  ...stylist,
  id: stylist.id || String(stylist.stylist_id),
  name: stylist.name || stylist.full_name,
  is_available: stylist.is_available ?? stylist.is_active ?? true,
});

export const stylistService = {
  async getAll(): Promise<Stylist[]> {
    const response = await api.get<any[]>('/stylists');
    return response.data.map(transformStylist);
  },

  async getAvailable(): Promise<Stylist[]> {
    // Use getAll since backend already filters to active stylists
    const response = await api.get<any[]>('/stylists');
    return response.data.map(transformStylist).filter(s => s.is_available);
  },

  async getById(id: string): Promise<Stylist> {
    const response = await api.get<any>(`/stylists/${id}`);
    return transformStylist(response.data);
  },

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    bio?: string;
    specializations?: string[];
  }): Promise<Stylist> {
    const response = await api.post<Stylist>('/stylists', data);
    return response.data;
  },

  async update(id: string, data: Partial<{
    name: string;
    email?: string;
    phone?: string;
    bio?: string;
    specializations?: string[];
    isAvailable: boolean;
  }>): Promise<Stylist> {
    const response = await api.patch<Stylist>(`/stylists/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/stylists/${id}`);
  },

  async getAvailability(id: string): Promise<StylistAvailability[]> {
    const response = await api.get<StylistAvailability[]>(`/stylists/${id}/availability`);
    return response.data;
  },

  async setAvailability(id: string, availability: Omit<StylistAvailability, 'id' | 'stylist_id'>[]): Promise<StylistAvailability[]> {
    const response = await api.post<StylistAvailability[]>(`/stylists/${id}/availability`, { availability });
    return response.data;
  },
};
