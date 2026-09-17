import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth';
import { usageKeys, getTokenBalance } from '@/features/usage';
import { API_BASE_URL } from '@/lib/api/client';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  const { data: balanceData } = useQuery({
    queryKey: usageKeys.balance(),
    queryFn: () => getTokenBalance(),
  });

  const currentBalance = balanceData?.balance ?? 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Settings Header */}
      <div className="pb-4 border-b border-white/[0.06]">
        <h1 className="text-xl font-display font-bold text-white tracking-tight">
          System & Account Settings
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Review cognitive orchestrator settings, usage ledger limits, and gateway status.
        </p>
      </div>

      <div className="space-y-4">
        {/* Account Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Profile</CardTitle>
            <CardDescription>
              Authenticated user details mapped directly to the backend User model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                value={user?.email || 'Loading...'}
                readOnly
                disabled
              />
              <div>
                <label className="block text-xs font-medium text-slate-300 select-none mb-1.5">
                  Assigned Roles & Status
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="brand" size="md">
                    {user?.roles?.join(', ') || 'USER'}
                  </Badge>
                  <Badge variant="success" size="md" dot>
                    {user?.status || 'ACTIVE'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Model Orchestration Card */}
        <Card>
          <CardHeader>
            <CardTitle>AI Orchestration & Context Bounds</CardTitle>
            <CardDescription>
              Model provider integration parameters governed by the backend environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0e1322]/80 border border-white/[0.07] p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Provider & Model</span>
                <p className="text-xs font-semibold text-slate-200">Configured via Backend Environment</p>
              </div>
              <div className="rounded-xl bg-[#0e1322]/80 border border-white/[0.07] p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Context Window</span>
                <p className="text-xs font-semibold text-slate-200">20 messages / 32,000 chars</p>
              </div>
              <div className="rounded-xl bg-[#0e1322]/80 border border-white/[0.07] p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Auto-Extraction</span>
                <p className="text-xs font-semibold text-slate-200">Bounded Semantic Memory</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token & Credit Ledger Card */}
        <Card>
          <CardHeader>
            <CardTitle>Token & Credit Ledger</CardTitle>
            <CardDescription>
              Atomic credit deduction policy enforced before invoking external AI providers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e1322]/80 border border-white/[0.07]">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-300">Available Balance</p>
                <p className="text-sm font-mono font-bold text-violet-300">{currentBalance} Credits</p>
              </div>
              <Badge variant="neutral" size="sm">Cost: 1 credit / turn</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Backend Gateway Card */}
        <Card>
          <CardHeader>
            <CardTitle>API Gateway Endpoint</CardTitle>
            <CardDescription>
              Active connection string configured through environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e1322]/80 border border-white/[0.07]">
              <div className="space-y-0.5">
                <p className="text-[11px] text-slate-400">VITE_API_BASE_URL</p>
                <p className="text-xs font-mono text-slate-200">
                  {API_BASE_URL}
                </p>
              </div>
              <Badge variant="success" size="sm" dot>Gateway Connected</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
