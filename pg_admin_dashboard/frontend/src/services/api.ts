import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

// Use relative URL when proxied by Vite, or environment variable for production
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post<ApiResponse<{ accessToken: string }>>(
            `${API_URL}/auth/refresh`,
            { refreshToken }
          );

          if (data.success && data.data?.accessToken) {
            localStorage.setItem('accessToken', data.data.accessToken);
            api.defaults.headers.common.Authorization = `Bearer ${data.data.accessToken}`;
            return api(originalRequest);
          }
        } catch {
          // Refresh failed, clear tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await api.post<ApiResponse<{
      user: { id: string; username: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>>('/auth/login', { username, password });
    return data;
  },

  logout: async () => {
    const { data } = await api.post<ApiResponse>('/auth/logout');
    return data;
  },

  me: async () => {
    const { data } = await api.get<ApiResponse<{ user: { id: string; username: string; role: string } }>>('/auth/me');
    return data;
  },
};

// Database API
export const databaseApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<Array<{
      datname: string;
      size_bytes: number;
      owner: string;
      datallowconn: boolean;
    }>>>('/databases');
    return data;
  },

  get: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/databases/${dbName}`);
    return data;
  },

  create: async (name: string, owner?: string) => {
    const { data } = await api.post<ApiResponse>('/databases', { name, owner });
    return data;
  },

  drop: async (dbName: string, confirm: string) => {
    const { data } = await api.delete<ApiResponse>(`/databases/${dbName}`, { data: { confirm } });
    return data;
  },

  getSchemas: async (dbName: string) => {
    const { data } = await api.get<ApiResponse<string[]>>(`/databases/${dbName}/schemas`);
    return data;
  },
};

// Table API
export const tableApi = {
  get: async (dbName: string, schema: string, table: string, limit = 50, offset = 0) => {
    const { data } = await api.get<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}`, {
      params: { limit, offset },
    });
    return data;
  },

  create: async (dbName: string, schema: string, name: string, columns: unknown[], options?: { addCreatedAt?: boolean; addUpdatedAt?: boolean }) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/tables`, {
      schema,
      name,
      columns,
      ...options,
    });
    return data;
  },

  drop: async (dbName: string, schema: string, table: string) => {
    const { data } = await api.delete<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}`);
    return data;
  },

  truncate: async (dbName: string, schema: string, table: string) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/truncate`);
    return data;
  },

  // Columns
  addColumn: async (dbName: string, schema: string, table: string, column: { name: string; type: string; notNull?: boolean; defaultValue?: string }) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/columns`, column);
    return data;
  },

  dropColumn: async (dbName: string, schema: string, table: string, column: string) => {
    const { data } = await api.delete<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/columns/${column}`);
    return data;
  },

  // Rows
  insertRow: async (dbName: string, schema: string, table: string, rowData: Record<string, unknown>) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/rows`, rowData);
    return data;
  },

  updateRow: async (dbName: string, schema: string, table: string, id: string, rowData: Record<string, unknown>, primaryKey = 'id') => {
    const { data } = await api.patch<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/rows/${id}`, { ...rowData, primaryKey });
    return data;
  },

  deleteRow: async (dbName: string, schema: string, table: string, id: string, primaryKey = 'id') => {
    const { data } = await api.delete<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/rows/${id}`, {
      params: { primaryKey },
    });
    return data;
  },

  // Indexes
  createIndex: async (dbName: string, schema: string, table: string, index: { name: string; columns: string; unique?: boolean }) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/indexes`, index);
    return data;
  },

  dropIndex: async (dbName: string, schema: string, table: string, indexName: string) => {
    const { data } = await api.delete<ApiResponse>(`/databases/${dbName}/tables/${schema}/${table}/indexes/${indexName}`);
    return data;
  },
};

// Query API
export const queryApi = {
  execute: async (dbName: string, sql: string, saveToHistory = true) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/query`, { sql, saveToHistory });
    return data;
  },

  explain: async (dbName: string, sql: string, analyze = false, format: 'text' | 'json' = 'text') => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/query/explain`, { sql, analyze, format });
    return data;
  },

  getHistory: async (dbName: string, limit = 50, offset = 0) => {
    const { data } = await api.get<ApiResponse>(`/databases/${dbName}/query/history`, { params: { limit, offset } });
    return data;
  },

  clearHistory: async (dbName: string) => {
    const { data } = await api.delete<ApiResponse>(`/databases/${dbName}/query/history`);
    return data;
  },

  exportCsv: (dbName: string, sql: string) => {
    // For CSV download, we need to handle it differently
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_URL}/databases/${dbName}/query/export/csv`;
    form.target = '_blank';

    const sqlInput = document.createElement('input');
    sqlInput.type = 'hidden';
    sqlInput.name = 'sql';
    sqlInput.value = sql;
    form.appendChild(sqlInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  },
};

// Schema API
export const schemaApi = {
  getTables: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/tables`);
    return data;
  },

  getForeignKeys: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/foreign-keys`);
    return data;
  },

  getFunctions: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/functions`);
    return data;
  },

  getTriggers: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/triggers`);
    return data;
  },

  getViews: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/views`);
    return data;
  },

  getExtensions: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/extensions`);
    return data;
  },

  getTypes: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/types`);
    return data;
  },

  getFull: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/schema/${dbName}/full`);
    return data;
  },
};

// Users API
export const usersApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse>('/users');
    return data;
  },

  create: async (user: { username: string; password: string; canCreateDb?: boolean; canCreateRole?: boolean; isSuperuser?: boolean }) => {
    const { data } = await api.post<ApiResponse>('/users', user);
    return data;
  },

  delete: async (username: string) => {
    const { data } = await api.delete<ApiResponse>(`/users/${username}`);
    return data;
  },

  changePassword: async (username: string, password: string) => {
    const { data } = await api.patch<ApiResponse>(`/users/${username}/password`, { password });
    return data;
  },

  grant: async (username: string, database: string) => {
    const { data } = await api.post<ApiResponse>(`/users/${username}/grant`, { database });
    return data;
  },

  revoke: async (username: string, database: string) => {
    const { data } = await api.post<ApiResponse>(`/users/${username}/revoke`, { database });
    return data;
  },
};

// Backup API
export const backupApi = {
  list: async (dbName: string) => {
    const { data } = await api.get<ApiResponse>(`/databases/${dbName}/backups`);
    return data;
  },

  listAll: async () => {
    const { data } = await api.get<ApiResponse>('/databases/backups');
    return data;
  },

  create: async (dbName: string, options: { format?: string; schemaOnly?: boolean; dataOnly?: boolean; compress?: boolean } = {}) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/backup`, options);
    return data;
  },

  download: async (dbName: string, filename: string) => {
    const response = await api.get(`/databases/${dbName}/backups/${filename}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  delete: async (dbName: string, filename: string) => {
    const { data } = await api.delete<ApiResponse>(`/databases/${dbName}/backups/${filename}`);
    return data;
  },

  restore: async (dbName: string, filename: string, clean = false) => {
    const { data } = await api.post<ApiResponse>(`/databases/${dbName}/restore`, { filename, clean });
    return data;
  },
};

// Performance API
export const performanceApi = {
  getStats: async () => {
    const { data } = await api.get<ApiResponse>('/performance');
    return data;
  },

  killConnection: async (pid: number) => {
    const { data } = await api.post<ApiResponse>(`/performance/connections/${pid}/kill`);
    return data;
  },

  vacuum: async (dbName: string, analyze = false) => {
    const { data } = await api.post<ApiResponse>(`/performance/databases/${dbName}/vacuum`, { analyze });
    return data;
  },

  analyze: async (dbName: string) => {
    const { data } = await api.post<ApiResponse>(`/performance/databases/${dbName}/analyze`);
    return data;
  },
};

// Table Export
export const exportApi = {
  tableCsv: async (dbName: string, schema: string, table: string) => {
    const response = await api.get(`/databases/${dbName}/tables/${schema}/${table}/export/csv`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema}_${table}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

export default api;
