import apiClient from '@/lib/api/client';
import type { ApiResponse, AuthResult, LoginCredentials, RegisterCredentials, SafeUser } from '@/types';

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'currentUser'] as const,
};

export const registerUser = async (credentials: RegisterCredentials): Promise<AuthResult> => {
  const response = await apiClient.post<ApiResponse<AuthResult>>('/auth/register', credentials);
  return response.data.data;
};

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResult> => {
  const response = await apiClient.post<ApiResponse<AuthResult>>('/auth/login', credentials);
  return response.data.data;
};

export const loginWithGoogle = async (credential: string): Promise<AuthResult> => {
  const response = await apiClient.post<ApiResponse<AuthResult>>('/auth/google', { credential });
  return response.data.data;
};

export const getCurrentUser = async (): Promise<SafeUser> => {
  const response = await apiClient.get<ApiResponse<SafeUser>>('/auth/me');
  return response.data.data;
};

export const linkGoogleAccount = async (
  credential: string,
): Promise<{ user: SafeUser; message: string }> => {
  const response = await apiClient.post<ApiResponse<{ user: SafeUser; message: string }>>(
    '/auth/google/link',
    { credential },
  );
  return response.data.data;
};

