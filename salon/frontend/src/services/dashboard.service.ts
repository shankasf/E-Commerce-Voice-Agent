import api from './api';
import { DashboardStats } from '@/types';

export const dashboardService = {
  async getOverview(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/api/dashboard/overview');
    return response.data;
  },

  async getRevenue(period: 'week' | 'month' | 'year'): Promise<{
    data: { date: string; revenue: number }[];
    total: number;
  }> {
    const response = await api.get('/api/dashboard/revenue', { params: { period } });
    return response.data;
  },

  async getPerformance(): Promise<{
    stylists: {
      id: string;
      name: string;
      appointments: number;
      revenue: number;
      rating: number;
    }[];
  }> {
    const response = await api.get('/api/dashboard/performance');
    return response.data;
  },

  async getAppointmentStats(period: 'week' | 'month' | 'year'): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    byDay: { day: string; count: number }[];
  }> {
    const response = await api.get('/api/dashboard/appointments', { params: { period } });
    return response.data;
  },
};
