import apiClient, { getAuthToken } from '@/lib/api/client';
import type { ApiResponse, TokenBalance } from '@/types';

export const usageKeys = {
  all: ['usage'] as const,
  balance: () => [...usageKeys.all, 'balance'] as const,
};

export const getTokenBalance = async (): Promise<TokenBalance> => {
  const token = getAuthToken();
  if (!token) {
    return { balance: 0, updatedAt: new Date().toISOString() };
  }
  const response = await apiClient.get<ApiResponse<TokenBalance>>('/tokens/balance');
  return response.data.data;
};
