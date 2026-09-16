import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  circle = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-elevated/80',
        circle ? 'rounded-full' : 'rounded-md',
        className,
      )}
      {...props}
    />
  );
};
