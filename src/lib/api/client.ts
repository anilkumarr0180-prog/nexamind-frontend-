import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse } from '@/types/api';

const TOKEN_STORAGE_KEY = 'nexamind_access_token';

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (callback: () => void): void => {
  onUnauthorizedCallback = callback;
};

export const clearOnUnauthorizedCallback = (): void => {
  onUnauthorizedCallback = null;
};

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Graceful fallback for non-storage environments
  }
};

export const clearAuthToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Graceful fallback
  }
};

export const normalizeApiBaseUrl = (rawUrl?: string): string => {
  if (!rawUrl || !rawUrl.trim()) {
    return 'http://localhost:5001/api/v1';
  }
  let clean = rawUrl.trim().replace(/\/+$/, '');
  // If the URL does not end with /api/v1, automatically append the path
  if (!clean.endsWith('/api/v1')) {
    if (clean.endsWith('/api')) {
      clean = `${clean}/v1`;
    } else {
      clean = `${clean}/api/v1`;
    }
  }
  return clean;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: attach bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Response interceptor: handle 401s selectively
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');

      // Only trigger session termination for authenticated requests, not initial login/register credential failures
      if (!isAuthAttempt && onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
