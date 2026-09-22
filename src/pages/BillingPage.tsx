import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { usageKeys, getTokenBalance } from '@/features/usage';
import {
  subscriptionKeys,
  getMySubscription,
  postCheckout,
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

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'active' || status === 'trialing') return 'success';
  if (status === 'past_due' || status === 'incomplete') return 'warning';
  if (status === 'canceled') return 'error';
  return 'neutral';
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

/* ------------------------------------------------------------------ */
/* Plan card                                                            */
/* ------------------------------------------------------------------ */

interface PlanCardProps {
  code: PlanCode;
  interval: BillingInterval;
  currentPlanCode?: PlanCode;
  onUpgrade: (code: PlanCode) => void;
  isUpgrading: boolean;
  upgradingTo: PlanCode | null;
}

const PlanCard: React.FC<PlanCardProps> = ({
  code,
  interval,
  currentPlanCode,
  onUpgrade,
  isUpgrading,
  upgradingTo,
}) => {
  const isCurrent = currentPlanCode === code;
  const price = PRICING[code][interval];
  const isLoading = isUpgrading && upgradingTo === code;
  const isPro = code === 'PRO';
  const isPlus = code === 'PLUS';

  return (
    <div
      className={[
        'relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300',
        isPro
          ? 'bg-gradient-to-b from-[#1a0f3e] via-[#130d2c] to-[#0d0c1e] border border-violet-500/50 shadow-[0_8px_60px_rgba(139,92,246,0.25)] hover:shadow-[0_8px_80px_rgba(139,92,246,0.38)] hover:border-violet-400/70'
          : isPlus
          ? 'bg-gradient-to-b from-[#0e1530] to-[#0b1020] border border-indigo-500/35 hover:border-indigo-400/55 hover:shadow-[0_4px_40px_rgba(99,102,241,0.18)]'
          : 'bg-gradient-to-b from-[#111827] to-[#0c1018] border border-white/[0.1] hover:border-white/25',
        isCurrent ? 'ring-2 ring-violet-500/60 ring-offset-[3px] ring-offset-[#16161a]' : '',
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
            {isCurrent && (
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

        {/* ── CTA ── */}
        <div className="mb-6">
          {code === 'FREE' ? (
            <button
              disabled
              className="w-full rounded-xl py-3 text-sm font-bold text-slate-600 border border-white/[0.07] bg-white/[0.02] cursor-not-allowed select-none"
            >
              {isCurrent ? 'Current Plan' : 'Get started free'}
            </button>
          ) : isCurrent ? (
            <button
              disabled
              className="w-full rounded-xl py-3 text-sm font-bold text-slate-600 border border-white/[0.07] bg-white/[0.02] cursor-not-allowed select-none"
            >
              Current Plan
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
                  Get {PLAN_LABELS[code]}
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
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
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [upgradingTo, setUpgradingTo] = useState<PlanCode | null>(null);

  /* Subscription — 404 → free user */
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

  /* Balance */
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useQuery({
    queryKey: usageKeys.balance(),
    queryFn: getTokenBalance,
  });

  /* Checkout */
  const checkoutMutation = useMutation({
    mutationFn: postCheckout,
    onSuccess: (data) => { window.location.href = data.checkoutUrl; },
  });

  /* Portal */
  const portalMutation = useMutation({
    mutationFn: getPortal,
    onSuccess: (data) => { window.location.href = data.portalUrl; },
  });

  const handleUpgrade = (planCode: PlanCode) => {
    setUpgradingTo(planCode);
    checkoutMutation.mutate({ planCode, interval });
  };

  const currentPlanCode: PlanCode = subscription?.planCode ?? 'FREE';
  const isPaidUser = subscription?.status === 'active' || subscription?.status === 'trialing';
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="space-y-4">
                {/* Plan name + status */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-extrabold text-white tracking-tight">
                    {PLAN_LABELS[currentPlanCode]} Plan
                  </span>
                  {subscription?.status && (
                    <Badge variant={statusVariant(subscription.status)} size="md" dot>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Badge>
                  )}
                  {currentPlanCode === 'FREE' && !subscription?.status && (
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
                  {subscription?.interval && (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.09] text-xs text-slate-400">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="capitalize">{subscription.interval}</span>
                    </div>
                  )}

                  {/* Renewal */}
                  {subscription?.currentPeriodEnd && (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.09] text-xs text-slate-400">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Renews {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  )}
                </div>

                {isSubError && !isSubLoading && (
                  <p className="text-xs text-slate-500 italic">Could not load subscription details.</p>
                )}
              </div>

              {isPaidUser && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => portalMutation.mutate()}
                  loading={portalMutation.isPending}
                  disabled={portalMutation.isPending}
                  className="flex-shrink-0 rounded-xl self-start"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage Billing
                </Button>
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
            <p className="text-sm text-slate-500 mt-1">Upgrade anytime · cancel via the Polar portal.</p>
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
          Subscription management, cancellation &amp; invoices handled securely via the Polar Customer Portal.
        </p>
      </div>

    </div>
  );
};
