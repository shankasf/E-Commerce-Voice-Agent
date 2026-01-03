import api from './api';
import { CallLog } from '@/types';

export const callService = {
  async getAll(params?: {
    direction?: 'inbound' | 'outbound';
    status?: string;
    from?: string;
    to?: string;
  }): Promise<CallLog[]> {
    const response = await api.get<{ data: CallLog[]; pagination: any }>('/calls', { params });
    return response.data.data;
  },

  async getById(id: string): Promise<CallLog> {
    const response = await api.get<CallLog>(`/calls/${id}`);
    return response.data;
  },

  async getRecent(limit?: number): Promise<CallLog[]> {
    const response = await api.get<CallLog[]>('/calls/recent', { params: { limit } });
    return response.data;
  },

  async getStats(): Promise<{
    totalCalls: number;
    todayCalls: number;
    avgDuration: number;
    byAgent: { agent: string; count: number }[];
  }> {
    const response = await api.get('/calls/stats');
    return response.data;
  },

  async getElevenLabsUsage(): Promise<{
    totalCharacters: number;
    totalCost: number;
    byDay: { date: string; characters: number; cost: number }[];
  }> {
    const response = await api.get('/calls/usage');
    return response.data;
  },
};
