import React from 'react';
import { useTheme } from './ThemeContext';

export const AppearanceSettings: React.FC = () => {
  const { mode, resolvedMode, setMode } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-150">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200 dark:border-white/[0.08]">
        <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">
          Appearance
        </h2>
        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1">
          Customize how NexaMind looks on your device. Switch between light and dark mode or match your system settings.
        </p>
      </div>

      {/* Visual Style Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-slate-200">
          Visual style
        </h3>

        {/* Mode Selection Box */}
        <div className="rounded-2xl bg-slate-50 dark:bg-[#131317] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-black dark:text-white block">
              Color mode
            </span>
            <span className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-0.5 block">
              Currently using{' '}
              <strong className="text-black dark:text-white font-bold capitalize">
                {mode === 'system' ? `System (${resolvedMode})` : mode}
              </strong>{' '}
              mode.
            </span>
          </div>

          {/* Mode preview cards side-by-side */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* 1. System Mode */}
            <button
              type="button"
              onClick={() => setMode('system')}
              title="System Mode (auto-detects OS theme)"
              aria-label="System Mode"
              className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all cursor-pointer ${
                mode === 'system'
                  ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-white/[0.08] shadow-lg shadow-blue-500/10'
                  : 'opacity-85 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="w-16 h-11 rounded-lg border border-slate-300 dark:border-white/20 overflow-hidden flex shadow-inner">
                {/* Left Half: Light Preview */}
                <div className="w-1/2 h-full bg-[#f8fafc] flex p-1 gap-1">
                  <div className="w-1.5 h-full bg-slate-300 rounded-[2px]" />
                  <div className="flex-1 flex flex-col gap-1 pt-0.5">
                    <div className="w-full h-1 bg-blue-500 rounded-[1px]" />
                    <div className="w-3/4 h-0.5 bg-slate-300 rounded-[1px]" />
                    <div className="w-1/2 h-0.5 bg-slate-300 rounded-[1px]" />
                  </div>
                </div>
                {/* Right Half: Dark Preview */}
                <div className="w-1/2 h-full bg-[#121217] flex p-1 gap-1 border-l border-white/10">
                  <div className="w-1.5 h-full bg-white/20 rounded-[2px]" />
                  <div className="flex-1 flex flex-col gap-1 pt-0.5">
                    <div className="w-full h-1 bg-blue-500 rounded-[1px]" />
                    <div className="w-3/4 h-0.5 bg-white/30 rounded-[1px]" />
                    <div className="w-1/2 h-0.5 bg-white/20 rounded-[1px]" />
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-black dark:text-slate-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                System
              </span>
            </button>

            {/* 2. Light / White Mode */}
            <button
              type="button"
              onClick={() => setMode('light')}
              title="Light Mode"
              aria-label="Light Mode"
              className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all cursor-pointer ${
                mode === 'light'
                  ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-white/[0.08] shadow-lg shadow-blue-500/10'
                  : 'opacity-85 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="w-16 h-11 rounded-lg border border-slate-300 dark:border-white/20 overflow-hidden bg-white flex p-1.5 gap-1.5 shadow-inner">
                <div className="w-2.5 h-full bg-slate-200 rounded-[2px]" />
                <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
                  <div className="w-full h-1.5 bg-blue-500 rounded-[1px]" />
                  <div className="w-5/6 h-1 bg-slate-300 rounded-[1px]" />
                  <div className="w-3/5 h-1 bg-slate-200 rounded-[1px]" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-black dark:text-slate-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                Light
              </span>
            </button>

            {/* 3. Dark Mode */}
            <button
              type="button"
              onClick={() => setMode('dark')}
              title="Dark Mode"
              aria-label="Dark Mode"
              className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all cursor-pointer ${
                mode === 'dark'
                  ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-white/[0.08] shadow-lg shadow-blue-500/10'
                  : 'opacity-85 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="w-16 h-11 rounded-lg border border-slate-300 dark:border-white/20 overflow-hidden bg-[#0d0d11] flex p-1.5 gap-1.5 shadow-inner">
                <div className="w-2.5 h-full bg-white/20 rounded-[2px]" />
                <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
                  <div className="w-full h-1.5 bg-blue-500 rounded-[1px]" />
                  <div className="w-5/6 h-1 bg-white/40 rounded-[1px]" />
                  <div className="w-3/5 h-1 bg-white/20 rounded-[1px]" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-black dark:text-slate-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                Dark
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
