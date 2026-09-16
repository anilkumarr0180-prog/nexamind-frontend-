import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4 text-slate-100 font-sans">
      <EmptyState
        icon={<span className="text-2xl font-bold font-mono">404</span>}
        title="Page not found"
        description="The resource or route you requested does not exist in the NexaMind cognitive workspace."
        action={
          <Link to="/app">
            <Button variant="secondary" size="sm">
              Return to Workspace
            </Button>
          </Link>
        }
      />
    </div>
  );
};
