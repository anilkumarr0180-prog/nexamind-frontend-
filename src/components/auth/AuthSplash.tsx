import React from 'react';

export const AuthSplash: React.FC = () => {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-canvas text-slate-100 font-sans select-none">
      <div className="flex flex-col items-center space-y-4">
        {/* NexaMind Logo with Subtle Pulse */}
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-subtle text-white font-bold text-lg animate-pulse">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">
            NexaMind
          </h2>
          <p className="text-xs text-slate-500">
            Initializing cognitive workspace...
          </p>
        </div>
      </div>
    </div>
  );
};
