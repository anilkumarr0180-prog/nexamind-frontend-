import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth, GoogleSignInButton } from "@/features/auth";
import { classifyApiError } from "@/lib/utils/error";
import { usageKeys, getTokenBalance } from "@/features/usage";
import {
  subscriptionKeys,
  getMySubscription,
  postCancelSubscription,
  postResumeSubscription,
  getPortal,
} from "@/features/subscriptions";
import { AppearanceSettings } from "@/features/theme";
import { getAuthToken } from "@/lib/api/client";
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

type SettingsTab = "appearance" | "billing" | "account";

export const SettingsPage: React.FC = () => {
  const { user, linkGoogleAccount } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const activeTab: SettingsTab = tabParam === "billing" ? "billing" : tabParam === "appearance" ? "appearance" : "account";

  const setActiveTab = (tab: SettingsTab) => {
    setSearchParams({ tab });
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleLinkGoogleSuccess = async (credential: string) => {
    setIsLinkingGoogle(true);
    setNotification(null);
    try {
      await linkGoogleAccount(credential);
      setNotification({
        type: "success",
        message: "Google account successfully linked! You can now sign in using Google.",
      });
    } catch (err: unknown) {
      const classified = classifyApiError(err, "Failed to link Google account");
      let message = classified.message;
      if (classified.code === "GOOGLE_ACCOUNT_IN_USE") {
        message = "This Google account is already linked to another NexaMind user.";
      } else if (
        classified.code === "GOOGLE_ALREADY_LINKED" ||
        classified.code === "ACCOUNT_ALREADY_LINKED"
      ) {
        message = "This Google account is already linked to your profile.";
      }
      setNotification({
        type: "error",
        message,
      });
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleLinkGoogleError = (err: Error | string) => {
    const message = typeof err === "string" ? err : err.message;
    if (
      message &&
      !message.toLowerCase().includes("user_cancel") &&
      !message.toLowerCase().includes("tap_outside")
    ) {
      setNotification({
        type: "error",
        message,
      });
    }
  };

  const isAuthed = Boolean(user && getAuthToken());

  /* User Credit Balance */
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useQuery({
    queryKey: usageKeys.balance(),
    queryFn: () => getTokenBalance(),
    enabled: isAuthed,
    retry: false,
  });

  /* Active Subscription */
  const {
    data: subscription,
    isLoading: isSubLoading,
  } = useQuery({
    queryKey: subscriptionKeys.me(),
    queryFn: getMySubscription,
    enabled: isAuthed,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 404) return false;
      return failureCount < 2;
    },
  });

  /* Portal Mutation */
  const portalMutation = useMutation({
    mutationFn: getPortal,
    onMutate: () => setNotification(null),
    onSuccess: (data) => {
      setNotification(null);
      const win = window.open(data.portalUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        window.location.href = data.portalUrl;
      }
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
    onMutate: () => setNotification(null),
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
    onMutate: () => setNotification(null),
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
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Settings Container */}
      <div className="rounded-2xl bg-white dark:bg-[#18181d] border border-slate-200 dark:border-white/[0.08] shadow-2xl shadow-slate-300/40 dark:shadow-black/60 overflow-hidden flex flex-col md:flex-row min-h-[520px]">
        {/* Left Tabs Sidebar */}
        <div className="w-full md:w-56 bg-slate-50/80 dark:bg-[#131317] border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/[0.08] p-2 sm:p-3 flex md:flex-col gap-1 flex-shrink-0 overflow-x-auto scrollbar-none">
          <div className="hidden md:block px-3 py-2 text-xs font-bold text-black dark:text-slate-200 uppercase tracking-wider select-none">
            Settings
          </div>

          {/* 1. Account Tab (First) */}
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "account"
                ? "bg-slate-200/90 dark:bg-white/[0.12] text-black dark:text-white font-bold shadow-sm"
                : "text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white font-semibold"
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

          {/* 2. Billing Tab (Second) */}
          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "billing"
                ? "bg-slate-200/90 dark:bg-white/[0.12] text-black dark:text-white font-bold shadow-sm"
                : "text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white font-semibold"
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

          {/* 3. Appearance Tab (Third) */}
          <button
            type="button"
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "appearance"
                ? "bg-slate-200/90 dark:bg-white/[0.12] text-black dark:text-white font-bold shadow-sm"
                : "text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white font-semibold"
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
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>Appearance</span>
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
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

            {/* TAB: APPEARANCE */}
            {activeTab === "appearance" && <AppearanceSettings />}

            {/* TAB: BILLING */}
            {activeTab === "billing" && (
              <div>
                <div className="pb-4 mb-6 border-b border-slate-200 dark:border-white/[0.08]">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Billing
                  </h2>
                </div>

                {isSubLoading ? (
                  <div className="space-y-6 py-6 animate-pulse">
                    <div className="h-10 bg-slate-100 dark:bg-white/[0.05] rounded-xl w-full" />
                    <div className="h-14 bg-slate-100 dark:bg-white/[0.05] rounded-xl w-full" />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-white/[0.08]">
                    {/* Row 1: Plan Title & Auto-renew status & Manage Button */}
                    <div className="pb-6 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            NexaMind {planCode === "FREE" ? "Free" : planCode === "PLUS" ? "Plus" : "Pro"}
                          </h3>
                          {isPaid && (
                            <Badge variant={isCanceled ? "warning" : "brand"} size="sm">
                              {isCanceled ? "Cancels Soon" : "Active"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-200 leading-relaxed font-medium">
                          {isPaid ? (
                            isCanceled ? (
                              <span>
                                Auto-renew is turned off. Your benefits remain active until{" "}
                                <strong className="text-slate-900 dark:text-white font-bold">{periodEndFormatted}</strong>.
                              </span>
                            ) : (
                              <span>
                                Your plan auto-renews on{" "}
                                <strong className="text-slate-900 dark:text-white font-bold">{periodEndFormatted}</strong>.
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
                            {portalMutation.isPending ? (
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
                            ) : (
                              <svg
                                className="w-3.5 h-3.5 text-white/70"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            )}
                            <span>{portalMutation.isPending ? "Opening..." : "Manage"}</span>
                          </button>
                        ) : (
                          <Link
                            to="/app/billing"
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
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
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {isPaid
                            ? isCanceled
                              ? "Resume subscription"
                              : "Cancel plan"
                            : "Upgrade your plan"}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed max-w-md font-medium">
                          {isPaid ? (
                            isCanceled ? (
                              <span>
                                Turn auto-renewal back on to keep your{" "}
                                <strong className="text-slate-900 dark:text-white font-bold">{planLabel}</strong> features
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
                              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
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
                            className="px-4 py-2 rounded-xl text-xs font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors inline-block flex-shrink-0"
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
                <div className="pb-4 border-b border-slate-200 dark:border-white/[0.08]">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
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
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 select-none mb-1.5">
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
                  <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-black dark:text-white">Available Credits</span>
                      <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
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
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors cursor-pointer"
                    >
                      Manage in Billing →
                    </button>
                  </div>

                  {/* Connected Accounts Section */}
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/[0.08] space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Connected Accounts
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Connect external identity providers to sign in with single sign-on.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-[#171b2d] border border-white/[0.12] flex items-center justify-center flex-shrink-0 shadow-sm">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              Google
                            </span>
                            {user?.isGoogleLinked ? (
                              <Badge variant="success" size="sm" dot>
                                Linked
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {user?.isGoogleLinked
                              ? "Your NexaMind account is connected to Google. You can sign in using either Google or your email and password."
                              : "Link your Google account to enable 1-click Google Sign-In with your NexaMind workspace."}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 sm:self-center">
                        {user?.isGoogleLinked ? (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold select-none">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Already linked</span>
                          </div>
                        ) : (
                          <div className="w-full sm:w-auto min-w-[200px]">
                            <GoogleSignInButton
                              text="link"
                              isLoading={isLinkingGoogle}
                              onSuccess={handleLinkGoogleSuccess}
                              onError={handleLinkGoogleError}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-xs font-bold text-black dark:text-slate-200">
            <span>NexaMind Preferences &amp; Subscriptions</span>
            {activeTab === "billing" && (
              <Link
                to="/app/billing"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors"
              >
                Compare all plans →
              </Link>
            )}
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
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-white/[0.12] shadow-2xl shadow-slate-400/40 dark:shadow-black/80 p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
              Cancel auto-renewal?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-200 mb-6 leading-relaxed font-medium">
              Your benefits will remain active until{" "}
              <strong className="text-slate-900 dark:text-white font-bold">{periodEndFormatted}</strong>. After that,
              your account will automatically switch to the Free tier and you will not be
              charged again.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-white bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/[0.12] transition-colors cursor-pointer"
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
