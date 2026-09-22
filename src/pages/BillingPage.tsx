import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { usageKeys, getTokenBalance } from '@/features/usage';
import {
  subscriptionKeys,
  getMySubscription,
  postCheckout,
  postUpgradeSubscription,
  postCancelSubscription,
  postResumeSubscription,
  postSyncSubscription,
  getPortal,
  PRICING,
} from '@/features/subscriptions';
import type { PlanCode, BillingInterval } from '@/types';

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}


const PLAN_LABELS: Record<PlanCode, string> = {
  FREE: 'Free',
  PLUS: 'Plus',
  PRO: 'Pro',
};

const PLAN_TAGLINES: Record<PlanCode, string> = {
  FREE: 'Best for getting started',
  PLUS: 'Best for power users',
  PRO: 'Best for professionals',
};

const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using_enough', label: "I'm not using it enough" },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'switched_service', label: 'Switched to another service' },
  { id: 'other', label: 'Other reason' },
];

/* ------------------------------------------------------------------ */
/* Plan card                                                            */
/* ------------------------------------------------------------------ */

interface PlanCardProps {
  code: PlanCode;
  interval: BillingInterval;
  currentPlanCode: PlanCode;
  currentInterval?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  onUpgrade: (code: PlanCode) => void;
  isUpgrading: boolean;
  upgradingTo: PlanCode | null;
}

const PlanCard: React.FC<PlanCardProps> = ({
  code,
  interval,
  currentPlanCode,
  currentInterval,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  onUpgrade,
  isUpgrading,
  upgradingTo,
}) => {
  const normCurrentInterval = currentInterval?.toLowerCase();
  const isExactCurrent = currentPlanCode === code && (code === 'FREE' || normCurrentInterval === interval);
  const isIntervalSwitch = currentPlanCode === code && normCurrentInterval !== interval && currentPlanCode !== 'FREE';

  const price = PRICING[code][interval];
  const isLoading = isUpgrading && upgradingTo === code;
  const isPro = code === 'PRO';
  const isPlus = code === 'PLUS';

  // Upgrade / Downgrade logic:
  // Hierarchy: FREE (0) < PLUS (1) < PRO (2)
  const planTierOrder: Record<PlanCode, number> = { FREE: 0, PLUS: 1, PRO: 2 };
  const isUpgrade = planTierOrder[code] > planTierOrder[currentPlanCode];
  const isDowngrade = planTierOrder[code] < planTierOrder[currentPlanCode];

  let buttonText = `Get ${PLAN_LABELS[code]}`;
  let isDisabled = isUpgrading;

  if (isExactCurrent) {
    buttonText = cancelAtPeriodEnd && currentPeriodEnd
      ? `Active until ${formatDate(currentPeriodEnd)}`
      : 'Current Plan';
    isDisabled = true;
  } else if (isIntervalSwitch) {
    buttonText = interval === 'yearly' ? 'Switch to Annual (Save ~17%) →' : 'Switch to Monthly →';
    isDisabled = isUpgrading;
  } else if (isDowngrade) {
    buttonText = code === 'FREE' ? 'Included in Plan' : 'Downgrade';
    isDisabled = true;
  } else if (isUpgrade) {
    buttonText = `Upgrade to ${PLAN_LABELS[code]} →`;
    isDisabled = isUpgrading;
  }

  return (
    <div
      className={[
        'relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300',
        isPro
          ? 'bg-gradient-to-b from-[#1a0f3e] via-[#130d2c] to-[#0d0c1e] border border-violet-500/50 shadow-[0_8px_60px_rgba(139,92,246,0.25)] hover:shadow-[0_8px_80px_rgba(139,92,246,0.38)] hover:border-violet-400/70'
          : isPlus
          ? 'bg-gradient-to-b from-[#0e1530] to-[#0b1020] border border-indigo-500/35 hover:border-indigo-400/55 hover:shadow-[0_4px_40px_rgba(99,102,241,0.18)]'
          : 'bg-gradient-to-b from-[#111827] to-[#0c1018] border border-white/[0.1] hover:border-white/25',
        isExactCurrent ? 'ring-2 ring-violet-500/70 ring-offset-[3px] ring-offset-[#0d1120]' : '',
      ].join(' ')}
    >
      {/* PRO top ribbon */}
      {isPro && (
        <div className="flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-violet-700/70 via-indigo-600/70 to-violet-700/70 border-b border-violet-400/30">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-white/95">
            ⚡ Most Popular
          </span>
        </div>
      )}

      {/* PRO ambient glow */}
      {isPro && (
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full bg-violet-600/15 blur-3xl" />
      )}

      <div className="flex flex-col flex-1 p-7">

        {/* ── Plan name + tagline ── */}
        <div className="mb-7">
          <div className="flex items-center justify-between mb-2">
            <h3
              className={[
                'text-2xl font-extrabold tracking-tight leading-none',
                isPro
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300'
                  : isPlus
                  ? 'text-indigo-200'
                  : 'text-white',
              ].join(' ')}
            >
              {PLAN_LABELS[code]}
            </h3>
            {isExactCurrent && (
              <Badge variant="brand" size="sm" dot>
                Current
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-slate-500 leading-snug">
            {PLAN_TAGLINES[code]}
          </p>
        </div>

        {/* ── Price ── */}
        <div className="mb-7">
          <div className="flex items-end gap-1 leading-none">
            <span
              className={[
                'text-[3.25rem] font-extrabold tracking-tight',
                isPro
                  ? 'text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-purple-200 to-indigo-300'
                  : 'text-white',
              ].join(' ')}
            >
              ${price}
            </span>
            {code !== 'FREE' && (
              <span className="text-sm text-slate-500 pb-2">
                &nbsp;/&nbsp;{interval === 'monthly' ? 'month' : 'year'}
              </span>
            )}
          </div>

          <p
            className={`mt-2 text-[12px] font-medium ${
              code !== 'FREE' && interval === 'yearly'
                ? 'text-emerald-400'
                : 'text-slate-600'
            }`}
          >
            {code === 'FREE'
              ? 'No credit card required'
              : interval === 'yearly'
              ? 'Billed annually · Save ~17%'
              : 'Billed monthly'}
          </p>
        </div>

        {/* ── CTA Button ── */}
        <div className="mb-6">
          {isDisabled ? (
            <button
              disabled
              className={[
                'w-full rounded-xl py-3 text-sm font-semibold border select-none cursor-not-allowed text-center transition-colors',
                isExactCurrent
                  ? 'border-violet-500/30 bg-violet-500/10 text-violet-300 font-bold'
                  : 'border-white/[0.07] bg-white/[0.02] text-slate-500',
              ].join(' ')}
            >
              {buttonText}
            </button>
          ) : (
            <button
              disabled={isUpgrading}
              onClick={() => onUpgrade(code)}
              className={[
                'w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-2 active:scale-[0.98]',
                isPro
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_4px_28px_rgba(139,92,246,0.5)] hover:shadow-[0_4px_36px_rgba(139,92,246,0.65)]'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_28px_rgba(99,102,241,0.5)]',
                isUpgrading ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Redirecting…
                </>
              ) : (
                <>
                  {buttonText}
                </>
              )}
            </button>
          )}
        </div>

        {/* ── Divider ── */}
        <div
          className={`h-px ${
            isPro
              ? 'bg-gradient-to-r from-transparent via-violet-500/25 to-transparent'
              : 'bg-white/[0.05]'
          }`}
        />

      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* BillingPage                                                          */
/* ------------------------------------------------------------------ */

export const BillingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [upgradingTo, setUpgradingTo] = useState<PlanCode | null>(null);

  // ChatGPT-style cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('too_expensive');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ChatGPT-style in-app upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [targetUpgradePlan, setTargetUpgradePlan] = useState<{ planCode: PlanCode; interval: BillingInterval } | null>(null);

  // Real-world activation modal state for checkout return
  const [activationModal, setActivationModal] = useState<{
    isOpen: boolean;
    status: 'syncing' | 'success' | 'error';
    planName?: string;
    credits?: number;
    errorMessage?: string;
  }>({
    isOpen: false,
    status: 'syncing',
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  // Handle checkout success return from Polar with real-time dynamic sync & loading confirmation
  useEffect(() => {
    const hasSuccessParam = searchParams.get('success') === 'true';
    const hasCustomerToken = searchParams.has('customer_session_token');
    const hasCheckoutId = searchParams.has('checkout_id');

    if (hasSuccessParam || hasCustomerToken || hasCheckoutId) {
      const planParam = (searchParams.get('plan') || 'PLUS').toUpperCase() as PlanCode;
      const initialPlanName = PLAN_LABELS[planParam] || 'Plus';

      setActivationModal({
        isOpen: true,
        status: 'syncing',
        planName: initialPlanName,
      });

      // Clean query params so refreshing doesn't replay modal
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('success');
      newParams.delete('plan');
      newParams.delete('checkout_id');
      newParams.delete('customer_session_token');
      setSearchParams(newParams, { replace: true });

      // Trigger server-side Polar sync to guarantee MongoDB subscription and credits are updated
      postSyncSubscription()
        .then((syncedSub) => {
          queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
          queryClient.invalidateQueries({ queryKey: usageKeys.balance() });

          const activePlan = syncedSub?.planCode ? PLAN_LABELS[syncedSub.planCode] : initialPlanName;
          const creditsGranted = activePlan === 'Pro' ? 20000 : 5000;

          setActivationModal({
            isOpen: true,
            status: 'success',
            planName: activePlan,
            credits: creditsGranted,
          });
        })
        .catch((err) => {
          console.error('Subscription post-checkout sync error:', err);
          queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
          queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
          setActivationModal((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: 'We could not verify your subscription immediately. Please retry sync or contact support.',
          }));
        });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const handleManualSync = async () => {
    try {
      setIsManualSyncing(true);
      await postSyncSubscription();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
        queryClient.invalidateQueries({ queryKey: usageKeys.balance() }),
      ]);
      setNotification({
        type: 'success',
        message: 'Subscription and token balance refreshed from Polar.',
      });
    } catch {
      setNotification({
        type: 'error',
        message: 'Could not sync subscription status. Please try again.',
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  /* Subscription Query */
  const {
    data: subscription,
    isLoading: isSubLoading,
    isError: isSubError,
  } = useQuery({
    queryKey: subscriptionKeys.me(),
    queryFn: getMySubscription,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  /* Balance Query */
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useQuery({
    queryKey: usageKeys.balance(),
    queryFn: getTokenBalance,
  });

  /* Checkout Mutation */
  const checkoutMutation = useMutation({
    mutationFn: postCheckout,
    onSuccess: (data) => { window.location.href = data.checkoutUrl; },
  });

  /* Portal Mutation */
  const portalMutation = useMutation({
    mutationFn: getPortal,
    onSuccess: (data) => { window.location.href = data.portalUrl; },
  });

  /* Cancel Auto-renew Mutation */
  const cancelMutation = useMutation({
    mutationFn: postCancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      setShowCancelModal(false);
      setNotification({
        type: 'success',
        message: 'Auto-renewal has been cancelled. Your plan will remain active until the end of your billing cycle.',
      });
    },
    onError: () => {
      setNotification({
        type: 'error',
        message: 'Could not cancel auto-renewal. Please try again or use the billing portal.',
      });
    },
  });

  /* Resume Auto-renew Mutation */
  const resumeMutation = useMutation({
    mutationFn: postResumeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      setNotification({
        type: 'success',
        message: 'Subscription successfully resumed! Auto-renewal is now active.',
      });
    },
    onError: () => {
      setNotification({
        type: 'error',
        message: 'Could not resume subscription. Please try again or contact support.',
      });
    },
  });

  /* In-app Upgrade Mutation with Real-Time Activation Modal */
  const upgradeMutation = useMutation({
    mutationFn: postUpgradeSubscription,
    onMutate: () => {
      setShowUpgradeModal(false);
      setActivationModal({
        isOpen: true,
        status: 'syncing',
        planName: targetUpgradePlan?.planCode ? PLAN_LABELS[targetUpgradePlan.planCode] : 'Pro',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
      const activePlan = data.subscription?.planCode ? PLAN_LABELS[data.subscription.planCode] : 'Pro';
      setActivationModal({
        isOpen: true,
        status: 'success',
        planName: activePlan,
        credits: 20000,
      });
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || 'Upgrade failed. Please try again.';
      setActivationModal({
        isOpen: true,
        status: 'error',
        errorMessage: msg,
      });
    },
  });

  const handleUpgrade = (planCode: PlanCode) => {
    setUpgradingTo(planCode);
    if (isPaidUser) {
      setTargetUpgradePlan({ planCode, interval });
      setShowUpgradeModal(true);
    } else {
      checkoutMutation.mutate({ planCode, interval });
    }
  };

  const currentPlanCode: PlanCode = subscription?.planCode ?? 'FREE';
  const isPaidUser =
    (subscription?.status === 'active' || subscription?.status === 'trialing') &&
    currentPlanCode !== 'FREE';
  const isCanceling = Boolean(subscription?.cancelAtPeriodEnd);
  const plans: PlanCode[] = ['FREE', 'PLUS', 'PRO'];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
          Billing{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
            &amp; Plans
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your subscription, credits, and billing preferences.
        </p>
      </div>

      {/* ── Inline Notification Banner ── */}
      {notification && (
        <div
          className={[
            'p-4 rounded-xl flex items-center justify-between gap-3 text-sm transition-all duration-300',
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-300',
          ].join(' ')}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Current plan banner ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.09] bg-gradient-to-br from-[#141c33] to-[#0d1120] shadow-[0_4px_40px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500/55 to-transparent" />

        <div className="p-6 sm:p-7">
          {/* Label */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Current Plan
            </span>
          </div>

          {isSubLoading || isBalanceLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-60" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="space-y-4">
                  {/* Plan name + status */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-extrabold text-white tracking-tight">
                      {PLAN_LABELS[currentPlanCode]} Plan
                    </span>

                    {isPaidUser ? (
                      isCanceling ? (
                        <Badge variant="warning" size="md" dot>
                          Cancels on {formatDate(subscription?.currentPeriodEnd)}
                        </Badge>
                      ) : (
                        <Badge variant="success" size="md" dot>
                          Active
                        </Badge>
                      )
                    ) : (
                      <Badge variant="neutral" size="md">Free tier</Badge>
                    )}
                  </div>

                  {/* Stat chips */}
                  <div className="flex flex-wrap gap-2.5">
                    {/* Credits */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <svg className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs text-slate-400">Credits</span>
                      <span className="text-sm font-bold font-mono text-violet-300">
                        {isBalanceError ? '—' : (balanceData?.balance ?? 0)}
                      </span>
                    </div>

                    {/* Interval */}
                    {subscription?.interval && isPaidUser && (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.09] text-xs text-slate-400">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="capitalize">{subscription.interval}</span>
                      </div>
                    )}

                    {/* Renewal / Expiry date */}
                    {subscription?.currentPeriodEnd && isPaidUser && (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.09] text-xs text-slate-400">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isCanceling
                          ? `Access until ${formatDate(subscription.currentPeriodEnd)}`
                          : `Renews ${formatDate(subscription.currentPeriodEnd)}`}
                      </div>
                    )}
                  </div>

                  {isSubError && !isSubLoading && (
                    <p className="text-xs text-slate-500 italic">Could not load subscription details.</p>
                  )}
                </div>

                {/* Right side Portal & Sync Buttons */}
                <div className="flex items-center gap-2 self-start flex-shrink-0 flex-wrap justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleManualSync}
                    loading={isManualSyncing}
                    disabled={isManualSyncing}
                    className="rounded-xl text-xs bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1]"
                    title="Refresh subscription and credits from Polar"
                  >
                    <svg className={`w-3.5 h-3.5 mr-1.5 flex-shrink-0 ${isManualSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Status
                  </Button>

                  {isPaidUser && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => portalMutation.mutate()}
                      loading={portalMutation.isPending}
                      disabled={portalMutation.isPending}
                      className="rounded-xl text-xs"
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Billing
                    </Button>
                  )}
                </div>
              </div>

              {/* ── ChatGPT-style Auto-pay Management Panel ── */}
              {isPaidUser && (
                <div className="pt-4 border-t border-white/[0.07]">
                  {isCanceling ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-200">
                            Auto-renew is turned off
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Your {PLAN_LABELS[currentPlanCode]} benefits will remain active until{' '}
                            <span className="font-semibold text-slate-200">{formatDate(subscription?.currentPeriodEnd)}</span>.
                            After that, your account will downgrade to Free and you will not be charged.
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => resumeMutation.mutate()}
                        loading={resumeMutation.isPending}
                        disabled={resumeMutation.isPending}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-[0_2px_16px_rgba(16,185,129,0.35)] rounded-xl flex-shrink-0"
                      >
                        Resume Subscription
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          Auto-renew is <strong className="text-emerald-400 font-semibold">ON</strong>. Your plan will renew on {formatDate(subscription?.currentPeriodEnd)}.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="self-start sm:self-auto text-slate-500 hover:text-rose-400 underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Cancel auto-renewal
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {portalMutation.isError && (
            <p className="mt-4 text-xs text-rose-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Failed to open billing portal. Please try again.
            </p>
          )}
        </div>
      </div>

      {/* ── Plan picker ── */}
      <div>
        {/* Section header + toggle */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Choose a Plan</h2>
            <p className="text-sm text-slate-500 mt-1">Upgrade anytime · cancel auto-renewal with 1-click.</p>
          </div>

          <div className="flex items-center gap-0.5 bg-[#0a0e1c] border border-white/[0.09] rounded-xl p-1">
            {(['monthly', 'yearly'] as BillingInterval[]).map((iv) => (
              <button
                key={iv}
                type="button"
                onClick={() => setInterval(iv)}
                className={[
                  'px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer select-none flex items-center gap-1.5 capitalize',
                  interval === iv
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_2px_14px_rgba(139,92,246,0.55)]'
                    : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {iv}
                {iv === 'yearly' && (
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full leading-none">
                    −17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-stretch">
          {plans.map((code) => (
            <PlanCard
              key={code}
              code={code}
              interval={interval}
              currentPlanCode={currentPlanCode}
              currentInterval={subscription?.interval}
              cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd}
              currentPeriodEnd={subscription?.currentPeriodEnd}
              onUpgrade={handleUpgrade}
              isUpgrading={checkoutMutation.isPending}
              upgradingTo={upgradingTo}
            />
          ))}
        </div>
      </div>

      {/* Checkout error */}
      {checkoutMutation.isError && (
        <p className="text-xs text-rose-400 text-center flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Failed to start checkout. Please try again.
        </p>
      )}

      {/* Footnote */}
      <div className="flex items-center justify-center gap-2 pb-4">
        <svg className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-[11px] text-slate-600">
          Subscription management, cancellation &amp; invoices handled securely via Polar &amp; NexaMind.
        </p>
      </div>

      {/* ── ChatGPT-Style Cancellation Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-lg rounded-2xl bg-[#0f1424] border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.8)] p-6 sm:p-7 space-y-6"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    Cancel {PLAN_LABELS[currentPlanCode]} Subscription?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Your auto-renewal will be turned off.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* What will happen list */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  You keep all {PLAN_LABELS[currentPlanCode]} benefits and token credits until{' '}
                  <strong className="text-white">{formatDate(subscription?.currentPeriodEnd)}</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>You will not be billed again unless you decide to resume.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>After {formatDate(subscription?.currentPeriodEnd)}, your account will switch to the Free tier.</span>
              </div>
            </div>

            {/* Optional Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Why are you canceling? <span className="text-slate-500 font-normal">(Optional feedback)</span>
              </label>
              <div className="space-y-1.5">
                {CANCELLATION_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={[
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer border transition-colors',
                      selectedReason === r.id
                        ? 'bg-violet-500/10 border-violet-500/40 text-violet-200'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={() => setSelectedReason(r.id)}
                      className="accent-violet-500 w-3.5 h-3.5"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelMutation.isPending}
                className="rounded-xl text-xs"
              >
                Keep Subscription
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => cancelMutation.mutate()}
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30"
              >
                Cancel Auto-renew
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ChatGPT-Style In-App Upgrade Proration Checkout Modal ── */}
      {showUpgradeModal && targetUpgradePlan && (() => {
        const now = Date.now();
        const periodEndMs = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : now + 30 * 86400000;
        const periodStartMs = subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).getTime() : periodEndMs - 30 * 86400000;
        const totalDurationMs = Math.max(periodEndMs - periodStartMs, 86400000);
        const remainingMs = Math.max(periodEndMs - now, 0);
        const daysRemaining = Math.max(1, Math.ceil(remainingMs / 86400000));
        const fractionRemaining = Math.min(Math.max(remainingMs / totalDurationMs, 0), 1);
        const plusCost = PRICING[currentPlanCode]?.[interval] ?? 10;
        const proCost = PRICING[targetUpgradePlan.planCode]?.[targetUpgradePlan.interval] ?? 20;
        const unusedCredit = Number((plusCost * fractionRemaining).toFixed(2));
        const dueToday = Number(Math.max(proCost - unusedCredit, 0).toFixed(2));
        const nextBillingDate = formatDate(subscription?.currentPeriodEnd);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div
              className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#151230] via-[#0f1424] to-[#0a0d18] border border-violet-500/40 shadow-[0_25px_80px_rgba(139,92,246,0.35)] p-6 sm:p-7 space-y-6 overflow-hidden relative"
              role="dialog"
              aria-modal="true"
            >
              {/* Top ambient glow */}
              <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 rounded-full bg-violet-600/20 blur-3xl" />

              {/* Modal Header */}
              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/35 flex items-center justify-center text-violet-300 flex-shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.25)]">
                    <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-white leading-tight">
                      Upgrade to {PLAN_LABELS[targetUpgradePlan.planCode]} Plan
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Prorated checkout · Instant credit grant · Secure Polar payment
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Prorated Line Item Breakdown (Like ChatGPT / Stripe Invoice) */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.07]">
                  <span className="font-semibold text-slate-300">Description</span>
                  <span className="font-semibold text-slate-300">Amount</span>
                </div>

                <div className="flex items-center justify-between text-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span>{PLAN_LABELS[targetUpgradePlan.planCode]} Plan ({targetUpgradePlan.interval})</span>
                  </div>
                  <span className="font-mono font-medium">${proCost.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-emerald-400">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Unused time on {PLAN_LABELS[currentPlanCode]} ({daysRemaining} days remaining)</span>
                  </div>
                  <span className="font-mono font-medium">-${unusedCredit.toFixed(2)}</span>
                </div>

                <div className="pt-2.5 border-t border-white/[0.07] flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold text-sm block">Total Due Today</span>
                    <span className="text-[11px] text-slate-400">Renews at ${proCost.toFixed(2)}/{targetUpgradePlan.interval === 'yearly' ? 'yr' : 'mo'} on {nextBillingDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 font-mono">
                      ${dueToday.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method & Secure Notice */}
              <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-slate-200 font-semibold block">Saved Card on File</span>
                    <span className="text-[11px] text-slate-400">Processed securely through Polar gateway</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  className="text-violet-300 hover:text-white underline underline-offset-2 transition-colors cursor-pointer text-[11px] flex-shrink-0 font-medium"
                >
                  {portalMutation.isPending ? 'Opening...' : 'Change Card →'}
                </button>
              </div>

              {/* Instant Benefit Highlight */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span className="text-slate-300 text-[11px]"><strong>+15,000 Credits</strong> added right now</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2">
                  <span className="text-base">🚀</span>
                  <span className="text-slate-300 text-[11px]"><strong>Priority Inference</strong> &amp; advanced models</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={upgradeMutation.isPending}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => upgradeMutation.mutate({ planCode: targetUpgradePlan.planCode, interval: targetUpgradePlan.interval })}
                  loading={upgradeMutation.isPending}
                  disabled={upgradeMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs px-5 py-2.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  Pay ${dueToday.toFixed(2)} &amp; Upgrade to {PLAN_LABELS[targetUpgradePlan.planCode]}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Checkout Return & Real-Time Activation Modal ── */}
      {activationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-[#161233] via-[#0f1424] to-[#0a0d18] border border-violet-500/40 p-7 sm:p-8 text-center shadow-[0_20px_80px_rgba(139,92,246,0.35)] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full bg-violet-600/20 blur-3xl" />

            {/* State A: Syncing / Loading */}
            {activationModal.status === 'syncing' && (
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" />
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 animate-pulse">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Activating Your {activationModal.planName || 'Plan'}...
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Verifying payment with Polar, establishing auto-renew settings, and allocating your monthly AI credits.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2.5 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 py-2.5 px-4 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                  <span>Syncing with Polar payment gateway...</span>
                </div>
              </div>
            )}

            {/* State B: Success Celebration */}
            {activationModal.status === 'success' && (
              <div className="space-y-6">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 animate-pulse" />
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white mb-2">
                    🎉 {activationModal.planName || 'Subscription'} Activated!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                    Your payment was confirmed. Your account has been upgraded with full access and credits.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-left space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Plan</span>
                    <span className="font-bold text-white">{activationModal.planName || 'Plus'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Monthly Credits Added</span>
                    <span className="font-bold text-emerald-400">+{activationModal.credits?.toLocaleString() || '5,000'} Credits</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Auto-Renew</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setActivationModal((prev) => ({ ...prev, isOpen: false }));
                    queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
                    queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
                  }}
                  className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-violet-600/30 cursor-pointer text-sm"
                >
                  Explore {activationModal.planName || 'Plus'} Features →
                </Button>
              </div>
            )}

            {/* State C: Error / Retry */}
            {activationModal.status === 'error' && (
              <div className="space-y-6">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Sync Delay Detected</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {activationModal.errorMessage || 'We are still waiting for Polar to finalize your transaction details.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActivationModal((prev) => ({ ...prev, isOpen: false }));
                      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
                      queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
                    }}
                    className="rounded-xl text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActivationModal((prev) => ({ ...prev, status: 'syncing' }));
                      postSyncSubscription()
                        .then((syncedSub) => {
                          queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
                          queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
                          setActivationModal({
                            isOpen: true,
                            status: 'success',
                            planName: syncedSub?.planCode ? PLAN_LABELS[syncedSub.planCode] : 'Plus',
                            credits: syncedSub?.planCode === 'PRO' ? 20000 : 5000,
                          });
                        })
                        .catch(() => {
                          setActivationModal((prev) => ({
                            ...prev,
                            status: 'error',
                            errorMessage: 'Payment gateway sync still in progress. Please check again in 30 seconds.',
                          }));
                        });
                    }}
                    className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs"
                  >
                    Retry Sync
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
