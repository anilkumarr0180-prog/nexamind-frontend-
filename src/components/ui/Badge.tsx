import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'ai';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variantStyles = {
    neutral: 'bg-surface-elevated text-slate-300 border-subtle',
    brand: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    ai: 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-200 border-violet-400/30',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    brand: 'bg-violet-400',
    success: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
    warning: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
    error: 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]',
    ai: 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)] animate-pulse',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border leading-none select-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};
