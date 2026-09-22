import type { PlanCode, BillingInterval } from '@/types';

export const PRICING: Record<PlanCode, Record<BillingInterval, number>> = {
  FREE: { monthly: 0, yearly: 0 },
  PLUS: { monthly: 10, yearly: 100 },
  PRO: { monthly: 20, yearly: 200 },
};
