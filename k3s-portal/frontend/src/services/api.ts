import axios, { type AxiosInstance } from 'axios';
import type {
  User,
  Namespace,
  Pod,
  Deployment,
  Secret,
  ConfigMap,
  PodMetrics,
  ClusterInfo,
  LoginCredentials,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ accessToken: string; user: User }> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },
};

// Dashboard API
export const dashboardApi = {
  getClusterInfo: async (): Promise<ClusterInfo> => {
    const response = await api.get('/kubernetes/cluster/info');
    return response.data;
  },
};

// Namespaces API
export const namespacesApi = {
  list: async (): Promise<Namespace[]> => {
    const response = await api.get('/kubernetes/namespaces');
    return response.data;
  },

  getManagedNamespaces: async (): Promise<{ namespaces: string[] }> => {
    const response = await api.get('/kubernetes/managed-namespaces');
    return response.data;
  },
};

// Pods API
export const podsApi = {
  list: async (namespace: string): Promise<Pod[]> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/pods`);
    return response.data;
  },

  get: async (namespace: string, name: string): Promise<Pod> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/pods/${name}`);
    return response.data;
  },

  restart: async (namespace: string, name: string): Promise<void> => {
    await api.post(`/kubernetes/namespaces/${namespace}/pods/${name}/restart`);
  },

  getLogs: async (
    namespace: string,
    name: string,
    options?: { container?: string; tailLines?: number }
  ): Promise<{ logs: string }> => {
    const params = new URLSearchParams();
    if (options?.container) params.append('container', options.container);
    if (options?.tailLines) params.append('tailLines', options.tailLines.toString());

    const response = await api.get(`/kubernetes/namespaces/${namespace}/pods/${name}/logs?${params}`);
    return response.data;
  },
};

// Deployments API
export const deploymentsApi = {
  list: async (namespace: string): Promise<Deployment[]> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/deployments`);
    return response.data;
  },

  get: async (namespace: string, name: string): Promise<Deployment> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/deployments/${name}`);
    return response.data;
  },

  scale: async (namespace: string, name: string, replicas: number): Promise<void> => {
    await api.post(`/kubernetes/namespaces/${namespace}/deployments/${name}/scale`, { replicas });
  },

  restart: async (namespace: string, name: string): Promise<void> => {
    await api.post(`/kubernetes/namespaces/${namespace}/deployments/${name}/restart`);
  },
};

// Secrets API
export const secretsApi = {
  list: async (namespace: string): Promise<Secret[]> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/secrets`);
    return response.data;
  },

  get: async (namespace: string, name: string): Promise<Secret> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/secrets/${name}`);
    return response.data;
  },

  update: async (namespace: string, name: string, data: Record<string, string>): Promise<void> => {
    await api.put(`/kubernetes/namespaces/${namespace}/secrets/${name}`, { data });
  },
};

// ConfigMaps API
export const configMapsApi = {
  list: async (namespace: string): Promise<ConfigMap[]> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/configmaps`);
    return response.data;
  },

  get: async (namespace: string, name: string): Promise<ConfigMap> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/configmaps/${name}`);
    return response.data;
  },

  update: async (namespace: string, name: string, data: Record<string, string>): Promise<void> => {
    await api.put(`/kubernetes/namespaces/${namespace}/configmaps/${name}`, { data });
  },
};

// Metrics API
export const metricsApi = {
  getPodMetrics: async (namespace: string): Promise<PodMetrics[]> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/metrics/pods`);
    return response.data;
  },
};

// Events API
export const eventsApi = {
  list: async (namespace: string): Promise<Event[]> => {
    const response = await api.get(`/kubernetes/namespaces/${namespace}/events`);
    return response.data;
  },
};

export default api;
