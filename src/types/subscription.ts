export type PlanCode = 'FREE' | 'PLUS' | 'PRO';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | string;

export interface Subscription {
  id: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  interval?: BillingInterval | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

export interface PortalResponse {
  portalUrl: string;
}

export interface CheckoutPayload {
  planCode: PlanCode;
  interval: BillingInterval;
}
