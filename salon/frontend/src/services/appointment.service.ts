import api from './api';
import { Appointment } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const appointmentService = {
  async getAll(params?: {
    status?: string;
    date?: string;
    customerId?: string;
    stylistId?: string;
  }): Promise<Appointment[]> {
    const response = await api.get<PaginatedResponse<Appointment>>('/appointments', { params });
    // Backend returns { data: [...], pagination: {...} }
    return response.data.data || [];
  },

  async getById(id: string): Promise<Appointment> {
    const response = await api.get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  async getByBookingReference(ref: string): Promise<Appointment> {
    const response = await api.get<Appointment>(`/appointments/reference/${ref}`);
    return response.data;
  },

  async getMyAppointments(): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>('/appointments/my');
    return response.data;
  },

  async getUpcoming(): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>('/appointments/upcoming');
    return response.data;
  },

  async create(data: {
    customerId: string;
    stylistId: string;
    serviceId: string;
    appointmentDate: string;
    startTime: string;
    notes?: string;
  }): Promise<Appointment> {
    // Transform to backend expected format (snake_case, service_ids array)
    const backendData = {
      stylist_id: parseInt(data.stylistId),
      service_ids: [parseInt(data.serviceId)],
      appointment_date: data.appointmentDate,
      start_time: data.startTime,
      customer_notes: data.notes,
    };
    const response = await api.post<Appointment>('/appointments', backendData);
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/appointments/${id}/status`, { status });
    return response.data;
  },

  async reschedule(id: string, data: {
    appointmentDate: string;
    startTime: string;
    stylistId?: string;
  }): Promise<Appointment> {
    const backendData = {
      appointment_date: data.appointmentDate,
      start_time: data.startTime,
      stylist_id: data.stylistId ? parseInt(data.stylistId) : undefined,
    };
    const response = await api.patch<Appointment>(`/appointments/${id}/reschedule`, backendData);
    return response.data;
  },

  async cancel(id: string, reason?: string): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/appointments/${id}/cancel`, { reason });
    return response.data;
  },

  async getAvailableSlots(data: {
    stylistId: string;
    serviceId: string;
    date: string;
  }): Promise<string[]> {
    const response = await api.get<string[]>('/appointments/available-slots', { params: data });
    return response.data;
  },
};
