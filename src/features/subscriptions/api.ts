import apiClient from '@/lib/api/client';
import type { ApiResponse, Subscription, CheckoutResponse, PortalResponse, CheckoutPayload } from '@/types';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  me: () => [...subscriptionKeys.all, 'me'] as const,
};

export const getMySubscription = async (): Promise<Subscription> => {
  const response = await apiClient.get<ApiResponse<Subscription>>('/subscriptions/me');
  return response.data.data;
};

export const postCheckout = async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
  const response = await apiClient.post<ApiResponse<CheckoutResponse>>('/subscriptions/checkout', payload);
  return response.data.data;
};

export const getPortal = async (): Promise<PortalResponse> => {
  const response = await apiClient.get<ApiResponse<PortalResponse>>('/subscriptions/portal');
  return response.data.data;
};
