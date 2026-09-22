import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth";
import { usageKeys, getTokenBalance } from "@/features/usage";
import {
  subscriptionKeys,
  getMySubscription,
  postCancelSubscription,
  postResumeSubscription,
  getPortal,
} from "@/features/subscriptions";
import type { PlanCode } from "@/types/subscription";

const PLAN_LABELS: Record<PlanCode, string> = {
  FREE: "Free Plan",
  PLUS: "Plus Plan",
  PRO: "Pro Plan",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "account" ? "account" : "billing";

  const setActiveTab = (tab: "billing" | "account") => {
    setSearchParams({ tab });
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /* User Credit Balance */
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useQuery({
    queryKey: usageKeys.balance(),
    queryFn: () => getTokenBalance(),
  });

  /* Active Subscription */
  const {
    data: subscription,
    isLoading: isSubLoading,
  } = useQuery({
    queryKey: subscriptionKeys.me(),
    queryFn: getMySubscription,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  /* Portal Mutation (Manage Billing) */
  const portalMutation = useMutation({
    mutationFn: getPortal,
    onSuccess: (data) => {
      window.location.href = data.portalUrl;
    },
    onError: () => {
      setNotification({
        type: "error",
        message: "Failed to open billing portal. Please try again.",
      });
    },
  });

  /* Cancel Auto-renew Mutation */
  const cancelMutation = useMutation({
    mutationFn: postCancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      setShowCancelModal(false);
      setNotification({
        type: "success",
        message:
          "Auto-renewal has been cancelled. Your plan will remain active until the end of your billing cycle.",
      });
    },
    onError: () => {
      setNotification({
        type: "error",
        message:
          "Could not cancel auto-renewal. Please try again or use the billing portal.",
      });
    },
  });

  /* Resume Auto-renew Mutation */
  const resumeMutation = useMutation({
    mutationFn: postResumeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      setNotification({
        type: "success",
        message: "Subscription successfully resumed! Auto-renewal is now active.",
      });
    },
    onError: () => {
      setNotification({
        type: "error",
        message: "Could not resume subscription. Please try again or contact support.",
      });
    },
  });

  const planCode: PlanCode = subscription?.planCode || "FREE";
  const planLabel = PLAN_LABELS[planCode] || "Free Plan";
  const isPaid = planCode !== "FREE";
  const isCanceled = Boolean(subscription?.cancelAtPeriodEnd);
  const periodEndFormatted = formatDate(subscription?.currentPeriodEnd);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Settings Container */}
      <div className="rounded-2xl bg-[#18181d] border border-white/[0.08] shadow-2xl shadow-black/60 overflow-hidden flex flex-col md:flex-row min-h-[520px]">
        {/* Left Tabs Sidebar */}
        <div className="w-full md:w-56 bg-[#131317] border-b md:border-b-0 md:border-r border-white/[0.08] p-3 flex md:flex-col gap-1 flex-shrink-0">
          <div className="hidden md:block px-3 py-2 text-xs font-semibold text-[#7878a0] uppercase tracking-wider select-none">
            Settings
          </div>

          {/* Billing Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "billing"
                ? "bg-white/[0.1] text-white shadow-sm"
                : "text-[#9090b0] hover:bg-white/[0.05] hover:text-[#e8e8f0]"
            }`}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span>Billing</span>
          </button>

          {/* Account Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "account"
                ? "bg-white/[0.1] text-white shadow-sm"
                : "text-[#9090b0] hover:bg-white/[0.05] hover:text-[#e8e8f0]"
            }`}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Account</span>
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          <div>
            {/* Notification Alert */}
            {notification && (
              <div
                className={`mb-6 p-3.5 rounded-xl text-xs font-medium flex items-center justify-between border animate-in fade-in duration-150 ${
                  notification.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <span>{notification.message}</span>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="ml-3 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TAB: BILLING */}
            {activeTab === "billing" && (
              <div>
                <div className="pb-4 mb-6 border-b border-white/[0.08]">
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    Billing
                  </h2>
                </div>

                {isSubLoading ? (
                  <div className="space-y-6 py-6 animate-pulse">
                    <div className="h-10 bg-white/[0.05] rounded-xl w-full" />
                    <div className="h-14 bg-white/[0.05] rounded-xl w-full" />
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.08]">
                    {/* Row 1: Plan Title & Auto-renew status & Manage Button */}
                    <div className="pb-6 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-white">
                            NexaMind {planCode === "FREE" ? "Free" : planCode === "PLUS" ? "Plus" : "Pro"}
                          </h3>
                          {isPaid && (
                            <Badge variant={isCanceled ? "warning" : "brand"} size="sm">
                              {isCanceled ? "Cancels Soon" : "Active"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[#9090b0] leading-relaxed">
                          {isPaid ? (
                            isCanceled ? (
                              <span>
                                Auto-renew is turned off. Your benefits remain active until{" "}
                                <strong className="text-slate-200">{periodEndFormatted}</strong>.
                              </span>
                            ) : (
                              <span>
                                Your plan auto-renews on{" "}
                                <strong className="text-slate-200">{periodEndFormatted}</strong>.
                              </span>
                            )
                          ) : (
                            <span>You are currently on the Free tier (100 credits included).</span>
                          )}
                        </p>
                      </div>

                      {/* Manage Button */}
                      <div>
                        {isPaid ? (
                          <button
                            type="button"
                            onClick={() => portalMutation.mutate()}
                            disabled={portalMutation.isPending}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                          >
                            {portalMutation.isPending && (
                              <svg
                                className="w-3.5 h-3.5 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                />
                              </svg>
                            )}
                            <span>Manage</span>
                          </button>
                        ) : (
                          <Link
                            to="/app/billing"
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
                          >
                            <span>Upgrade</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Cancel plan / Auto-renew Control */}
                    <div className="py-6 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <h4 className="text-sm font-medium text-white">
                          {isPaid
                            ? isCanceled
                              ? "Resume subscription"
                              : "Cancel plan"
                            : "Upgrade your plan"}
                        </h4>
                        <p className="text-xs text-[#9090b0] leading-relaxed max-w-md">
                          {isPaid ? (
                            isCanceled ? (
                              <span>
                                Turn auto-renewal back on to keep your{" "}
                                <strong className="text-slate-200">{planLabel}</strong> features
                                without interruption.
                              </span>
                            ) : (
                              "If you cancel, you'll keep full access to your plan features until the end of your billing period."
                            )
                          ) : (
                            "Unlock more credits, priority intelligence routing, and unlimited turns with Plus or Pro."
                          )}
                        </p>
                      </div>

                      {/* Cancel or Resume Action */}
                      <div>
                        {isPaid ? (
                          isCanceled ? (
                            <button
                              type="button"
                              onClick={() => resumeMutation.mutate()}
                              disabled={resumeMutation.isPending}
                              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
                            >
                              {resumeMutation.isPending ? "Resuming..." : "Resume"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowCancelModal(true)}
                              disabled={cancelMutation.isPending}
                              className="px-4 py-2 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
                            >
                              {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                            </button>
                          )
                        ) : (
                          <Link
                            to="/app/billing"
                            className="px-4 py-2 rounded-xl text-xs font-medium text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-colors inline-block flex-shrink-0"
                          >
                            View Plans
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACCOUNT */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-white/[0.08]">
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    Account Profile
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Display Name"
                      value={user?.name || "Not set"}
                      readOnly
                      disabled
                    />
                    <Input
                      label="Email Address"
                      value={user?.email || "Loading..."}
                      readOnly
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 select-none mb-1.5">
                      Account Status &amp; Role
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="brand" size="md">
                        {user?.roles?.join(", ") || "USER"}
                      </Badge>
                      <Badge variant="success" size="md" dot>
                        {user?.status || "ACTIVE"}
                      </Badge>
                    </div>
                  </div>

                  {/* Credits Overview */}
                  <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#9090b0]">Available Credits</span>
                      <p className="text-lg font-mono font-bold text-violet-300">
                        {isBalanceLoading
                          ? "Loading..."
                          : isBalanceError
                          ? "Unavailable"
                          : `${balanceData?.balance ?? 0} Credits`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("billing")}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
                    >
                      Manage in Billing →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-6 mt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#7878a0]">
            <span>Subscription &amp; payments powered securely via Polar.</span>
            <Link
              to="/app/billing"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Compare all plans →
            </Link>
          </div>
        </div>
      </div>

      {/* Cancel Auto-Renewal Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#1e1e24] border border-white/[0.12] shadow-2xl shadow-black/80 p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-white mb-2">
              Cancel auto-renewal?
            </h3>
            <p className="text-sm text-[#9090b0] mb-6 leading-relaxed">
              Your benefits will remain active until{" "}
              <strong className="text-white">{periodEndFormatted}</strong>. After that,
              your account will automatically switch to the Free tier and you will not be
              charged again.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#c8c8e0] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Auto-renew"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
