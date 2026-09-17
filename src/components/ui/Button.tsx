import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variantStyles = {
      primary:
        'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:from-violet-700 active:to-indigo-700 text-white shadow-subtle hover:shadow-glow-brand border border-violet-400/30',
      secondary:
        'bg-[#182035] hover:bg-[#212b48] active:bg-[#2a365b] text-slate-200 border border-white/[0.08] hover:border-white/[0.16]',
      ghost:
        'bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] text-slate-300 hover:text-white',
      outline:
        'bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.12] hover:border-violet-500/40',
      danger:
        'bg-accent-rose/15 hover:bg-accent-rose/25 active:bg-accent-rose/30 text-rose-300 border border-rose-500/30 hover:border-rose-500/50',
    };

    const sizeStyles = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-3.5 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
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
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
