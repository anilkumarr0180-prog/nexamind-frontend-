import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-900 dark:text-white select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full h-11 rounded-xl bg-slate-50 dark:bg-[#111628]/80 backdrop-blur-md border text-sm text-black dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-150',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-300 dark:border-white/[0.10] hover:border-slate-400 dark:hover:border-white/[0.18] focus:border-indigo-500/80 dark:focus:border-violet-500/80 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-violet-500/25',
              'focus:outline-none',
              disabled && 'opacity-90 cursor-not-allowed bg-slate-100 dark:bg-[#0e1220] text-black dark:text-white font-medium',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-2.5 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-400/90 leading-tight pt-0.5">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-400 leading-tight pt-0.5">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
