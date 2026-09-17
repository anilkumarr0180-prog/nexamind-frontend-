import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  elevated = false,
  interactive = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        elevated
          ? 'bg-[#182035]/85 backdrop-blur-md border border-white/[0.12] shadow-elevated'
          : 'bg-[#13192a]/75 backdrop-blur-md border border-white/[0.08] shadow-card',
        interactive &&
          'hover:bg-[#1b243c]/90 hover:border-violet-500/40 cursor-pointer active:scale-[0.99] hover:shadow-glow-subtle',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-5 border-b border-white/[0.06]', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={cn('text-base font-display font-semibold tracking-tight text-white', className)}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, children, ...props }) => {
  return (
    <p className={cn('text-xs text-slate-400 leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-5 pt-0 border-t border-white/[0.06] mt-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
