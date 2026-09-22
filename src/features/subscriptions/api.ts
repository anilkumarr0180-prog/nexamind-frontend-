import apiClient from '@/lib/api/client';
import type { ApiResponse, Subscription, CheckoutResponse, PortalResponse, CheckoutPayload } from '@/types';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  me: () => [...subscriptionKeys.all, 'me'] as const,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeSubscription = (raw: any): Subscription | null => {
  if (!raw) return null;
  const subData = raw.subscription ?? raw;
  if (!subData || !subData.id) return null;

  return {
    ...subData,
    planCode: (subData.planCode || subData.plan?.code || 'FREE').toUpperCase() as Subscription['planCode'],
    status: (subData.status || '').toLowerCase() as Subscription['status'],
    interval: subData.interval ? (subData.interval.toLowerCase() as Subscription['interval']) : null,
    cancelAtPeriodEnd: Boolean(subData.cancelAtPeriodEnd),
  };
};

export const getMySubscription = async (): Promise<Subscription | null> => {
  const response = await apiClient.get<ApiResponse<{ subscription: Subscription | null } | Subscription>>('/subscriptions/me');
  return normalizeSubscription(response.data.data);
};

export const postCancelSubscription = async (): Promise<Subscription | null> => {
  const response = await apiClient.post<ApiResponse<{ subscription: Subscription } | Subscription>>('/subscriptions/cancel');
  return normalizeSubscription(response.data.data);
};

export const postResumeSubscription = async (): Promise<Subscription | null> => {
  const response = await apiClient.post<ApiResponse<{ subscription: Subscription } | Subscription>>('/subscriptions/resume');
  return normalizeSubscription(response.data.data);
};

export const postSyncSubscription = async (): Promise<Subscription | null> => {
  const response = await apiClient.post<ApiResponse<{ subscription: Subscription | null } | Subscription>>('/subscriptions/sync');
  return normalizeSubscription(response.data.data);
};

export const postUpgradeSubscription = async (payload: CheckoutPayload): Promise<{ subscription: Subscription | null; creditGrant: number }> => {
  const response = await apiClient.post<ApiResponse<{ subscription: Subscription; creditGrant: number }>>('/subscriptions/upgrade', payload);
  const data = response.data.data;
  return {
    subscription: normalizeSubscription(data.subscription),
    creditGrant: data.creditGrant ?? 0,
  };
};

export const postCheckout = async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
  const response = await apiClient.post<ApiResponse<CheckoutResponse>>('/subscriptions/checkout', payload);
  return response.data.data;
};

export const getPortal = async (): Promise<PortalResponse> => {
  const response = await apiClient.get<ApiResponse<PortalResponse>>('/subscriptions/portal');
  return response.data.data;
};
