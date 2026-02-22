import api from './api';
import { AuthResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResponse> {
    // Convert firstName/lastName to full_name for backend
    const payload = {
      email: data.email,
      password: data.password,
      full_name: `${data.firstName} ${data.lastName}`.trim(),
      phone: data.phone,
    };
    const response = await api.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  setAuth(token: string, user: User): void {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
};
