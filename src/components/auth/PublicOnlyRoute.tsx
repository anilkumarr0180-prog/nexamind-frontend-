import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { AuthSplash } from './AuthSplash';

export const PublicOnlyRoute: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { status } = useAuth();

  if (status === 'AUTHENTICATING') {
    return <AuthSplash />;
  }

  if (status === 'AUTHENTICATED') {
    return <Navigate to="/app" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
