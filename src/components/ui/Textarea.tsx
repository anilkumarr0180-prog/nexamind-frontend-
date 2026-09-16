import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, disabled, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-slate-300 select-none"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg bg-surface-muted border text-sm text-slate-100 placeholder-slate-500 transition-colors p-3 resize-none',
            error
              ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-default focus:border-brand-500 focus:ring-brand-500/20',
            'focus:outline-none focus:ring-2',
            disabled && 'opacity-60 cursor-not-allowed bg-surface',
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-400 leading-none">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500 leading-none">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
