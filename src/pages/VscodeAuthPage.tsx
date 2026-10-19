import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth, authorizeVscode } from "@/features/auth";
import { Button } from "@/components/ui/Button";
import { NexaMindIcon } from "@/components/ui";

export const VscodeAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const codeChallenge = searchParams.get("code_challenge") || searchParams.get("codeChallenge");
  const state = searchParams.get("state");
  const redirectUri = searchParams.get("redirect_uri") || searchParams.get("redirectUri");
  const codeChallengeMethod =
    searchParams.get("code_challenge_method") || searchParams.get("codeChallengeMethod") || "S256";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRedirectUri, setSuccessRedirectUri] = useState<string | null>(null);

  // Validate parameters
  const paramError = !codeChallenge
    ? "Missing PKCE code challenge parameter (code_challenge)."
    : !state
    ? "Missing PKCE state parameter (state)."
    : !redirectUri
    ? "Missing callback URI parameter (redirect_uri)."
    : null;

  const handleAuthorize = async () => {
    if (paramError || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authorizeVscode({
        codeChallenge: codeChallenge!,
        codeChallengeMethod,
        state: state!,
        redirectUri: redirectUri!,
      });

      setSuccessRedirectUri(response.redirectUri);
      // Attempt browser redirect to custom protocol (vscode://...)
      window.location.href = response.redirectUri;
    } catch (err: unknown) {
      const message =
        (err as any)?.response?.data?.error?.message ||
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to authorize Visual Studio Code.");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0a0d14] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent_70%),radial-gradient(ellipse_60%_50%_at_50%_110%,rgba(99,102,241,0.10),transparent_70%)] px-4 py-12 text-slate-100 font-sans relative overflow-hidden">
      <div className="w-full max-w-[460px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-glow-brand mb-1 transition-transform hover:scale-105 duration-200">
            <div className="h-full w-full bg-[#121626] rounded-[15px] flex items-center justify-center">
              <NexaMindIcon className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-display font-bold tracking-tight text-white">
            Authorize <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">VS Code</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Connect your NexaMind AI account to the Visual Studio Code extension
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#12172a]/85 backdrop-blur-xl border border-white/[0.12] shadow-2xl p-6 sm:p-8 space-y-5">
          {paramError ? (
            <div
              role="alert"
              className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 leading-relaxed flex items-start gap-3"
            >
              <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-rose-200">Invalid Authorization Request</p>
                <p className="mt-1">{paramError}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Please initiate authentication from within Visual Studio Code by running the &quot;NexaMind: Login&quot; command.
                </p>
              </div>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 leading-relaxed flex items-start gap-3"
            >
              <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-rose-200">Authorization Failed</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          ) : successRedirectUri ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Authorization Granted!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Redirecting back to Visual Studio Code. You may close this browser tab.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={successRedirectUri}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 underline font-medium"
                >
                  Click here if VS Code didn&apos;t open automatically
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Signed in user profile pill */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/[0.08]">
                <div className="h-9 w-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-semibold text-sm">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{user?.name || "NexaMind User"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Active
                </span>
              </div>

              {/* Scopes / Permissions info */}
              <div className="space-y-2 text-xs">
                <p className="font-medium text-slate-300">NexaMind VS Code extension will be granted access to:</p>
                <ul className="space-y-2 text-slate-400">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Execute AI assistant queries and code generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Inspect workspace diagnostics and propose structured code edits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Access memory and conversation history</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleAuthorize}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full h-11 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 hover:from-brand-500 hover:via-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/25 border border-brand-400/25 transition-all duration-200 cursor-pointer"
                >
                  Authorize Visual Studio Code
                </Button>
                <button
                  type="button"
                  onClick={() => navigate("/app")}
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  Cancel and return to app
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
