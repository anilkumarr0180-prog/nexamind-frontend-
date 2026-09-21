import React from 'react';
import { NexaMindIcon } from '@/components/ui';

export const AuthSplash: React.FC = () => {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0b0f19] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.15),transparent_70%)] text-slate-100 font-sans select-none">
      <div className="flex flex-col items-center space-y-4">
        {/* NexaMind Logo with Subtle Pulse */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e1b4b] via-[#16143c] to-[#0c0b1e] shadow-xl shadow-violet-950/60 border border-violet-500/40 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 via-transparent to-cyan-400/20 rounded-2xl pointer-events-none" />
          <NexaMindIcon className="w-8 h-8" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-base font-bold tracking-tight text-white">
            Nexa<span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">Mind</span>
          </h2>
          <p className="text-xs text-slate-400">
            Initializing cognitive workspace...
          </p>
        </div>
      </div>
    </div>
  );
};

