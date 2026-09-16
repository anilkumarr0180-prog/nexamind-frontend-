import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  setOnUnauthorizedCallback,
  clearOnUnauthorizedCallback,
} from '@/lib/api/client';
import { getCurrentUser, loginUser, registerUser, authKeys } from './api';
import type { LoginCredentials, RegisterCredentials, SafeUser } from '@/types';

export type AuthStatus = 'AUTHENTICATING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface AuthContextValue {
  status: AuthStatus;
  user: SafeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('AUTHENTICATING');
  const [user, setUser] = useState<SafeUser | null>(null);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setStatus('UNAUTHENTICATED');
    queryClient.clear();
  }, [queryClient]);

  const loadCurrentUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setStatus('UNAUTHENTICATED');
      return;
    }

    try {
      setStatus('AUTHENTICATING');
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      queryClient.setQueryData(authKeys.currentUser(), currentUser);
      setStatus('AUTHENTICATED');
    } catch {
      // Token invalid, expired, or user not found
      clearAuthToken();
      setUser(null);
      setStatus('UNAUTHENTICATED');
      queryClient.clear();
    }
  }, [queryClient]);

  useEffect(() => {
    // Register global 401 callback for authenticated API calls
    setOnUnauthorizedCallback(logout);

    // Initial auth verification on boot
    loadCurrentUser();

    return () => {
      clearOnUnauthorizedCallback();
    };
  }, [logout, loadCurrentUser]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const result = await loginUser(credentials);
      setAuthToken(result.accessToken);
      setUser(result.user);
      queryClient.setQueryData(authKeys.currentUser(), result.user);
      setStatus('AUTHENTICATED');
    },
    [queryClient],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      const result = await registerUser(credentials);
      setAuthToken(result.accessToken);
      setUser(result.user);
      queryClient.setQueryData(authKeys.currentUser(), result.user);
      setStatus('AUTHENTICATED');
    },
    [queryClient],
  );

  const value: AuthContextValue = {
    status,
    user,
    isAuthenticated: status === 'AUTHENTICATED',
    isLoading: status === 'AUTHENTICATING',
    login,
    register,
    logout,
    refetchUser: loadCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
