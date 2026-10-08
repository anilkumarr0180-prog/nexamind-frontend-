import React, { useEffect, useRef, useState } from 'react';
import { useGoogleIdentityServices } from './useGoogleIdentityServices';

export interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  text?: 'continue' | 'signin' | 'signup' | 'link';
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  isLoading = false,
  text = 'continue',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  const buttonText =
    text === 'signup'
      ? 'Sign up with Google'
      : text === 'signin'
        ? 'Sign in with Google'
        : text === 'link'
          ? 'Link Google account'
          : 'Continue with Google';

  const loadingText =
    text === 'link'
      ? 'Linking Google account...'
      : 'Signing in with Google...';

  const { isReady, isConfigured, renderButton, prompt } = useGoogleIdentityServices({
    onSuccess: async (credential) => {
      try {
        await onSuccess(credential);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google authentication failed';
        onError?.(new Error(message));
      }
    },
    onError: (err) => {
      const message = typeof err === 'string' ? err : err.message;
      setInternalError(message);
      onError?.(err);
    },
    context: text === 'signup' ? 'signup' : (text === 'link' ? 'use' : 'signin'),
  });

  // Attempt official Google button render when GIS is ready and container is available
  useEffect(() => {
    if (isReady && containerRef.current && isConfigured) {
      try {
        const width = containerRef.current.clientWidth || 360;
        // GIS requires width to be a number between 200 and 400
        const clampedWidth = Math.min(Math.max(width, 240), 400);

        renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: clampedWidth,
        });
      } catch {
        // Fallback: custom button with prompt() handles clicks
      }
    }
  }, [isReady, isConfigured, renderButton]);

  const handleClick = () => {
    if (disabled || isLoading) return;

    if (!isConfigured) {
      console.warn('[GoogleAuth] Google Sign-In is not configured: missing VITE_GOOGLE_CLIENT_ID in frontend .env');
      const userFriendlyMsg = 'Google Sign-In is not configured yet. Please sign in with email and password.';
      if (onError) {
        onError(new Error(userFriendlyMsg));
      } else {
        setInternalError(userFriendlyMsg);
      }
      return;
    }

    if (isReady) {
      prompt();
    }
  };

  return (
    <div className={`w-full flex flex-col items-center gap-1.5 ${className}`}>
      <div className="relative w-full rounded-xl overflow-hidden">
        {/* Sleek NexaMind Branded Button (Always visible with pixel-perfect dark theme) */}
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isLoading}
          data-testid="google-signin-button"
          aria-label={buttonText}
          className={`w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-white/[0.14] bg-[#171b2d] hover:bg-[#1f243b] active:bg-[#151928] text-slate-200 font-medium text-sm transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isLoading ? 'animate-pulse' : ''
          }`}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-4 w-4 text-violet-400 flex-shrink-0"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-4.5 h-4.5 min-w-[18px] min-h-[18px] max-w-[18px] max-h-[18px] flex-shrink-0"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isLoading ? loadingText : buttonText}</span>
        </button>

        {/* Official Google GIS Button Container (Overlayed invisibly to trigger real Google popup on click) */}
        <div
          ref={containerRef}
          data-testid="google-gis-container"
          className={`absolute inset-0 opacity-[0.0001] cursor-pointer overflow-hidden z-10 flex items-center justify-center [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:scale-150 [&_iframe]:cursor-pointer ${
            isLoading || disabled ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        />
      </div>

      {internalError && !isConfigured && !onError && (
        <p className="text-[11px] text-amber-400/90 text-center font-normal px-2">
          {internalError}
        </p>
      )}
    </div>
  );
};
