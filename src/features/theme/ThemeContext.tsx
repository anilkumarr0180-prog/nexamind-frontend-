import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type {
  ThemeMode,
  ResolvedMode,
  ThemeSettings,
  ThemeContextValue,
} from './types';
import {
  ACCENT_COLOR_OPTIONS,
  THEME_PRESET_OPTIONS,
  DEFAULT_THEME_SETTINGS,
  THEME_STORAGE_KEY,
} from './constants';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialSettings(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME_SETTINGS;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THEME_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to parse saved theme settings:', err);
  }
  return DEFAULT_THEME_SETTINGS;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(getInitialSettings);

  // Compute resolved mode ('light' | 'dark')
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const resolvedMode: ResolvedMode = useMemo(() => {
    if (settings.mode === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return settings.mode;
  }, [settings.mode, systemIsDark]);

  // Find active preset
  const activePreset = useMemo(() => {
    return (
      THEME_PRESET_OPTIONS.find((p) => p.id === settings.preset) ||
      THEME_PRESET_OPTIONS[0]
    );
  }, [settings.preset]);

  // Find active accent
  const activeAccent = useMemo(() => {
    return (
      ACCENT_COLOR_OPTIONS.find((a) => a.id === settings.accent) ||
      ACCENT_COLOR_OPTIONS[0]
    );
  }, [settings.accent]);

  // Current background hex (custom or preset-based)
  const backgroundHex = useMemo(() => {
    if (settings.customBackground) return settings.customBackground;
    return resolvedMode === 'dark' ? activePreset.darkBg : activePreset.lightBg;
  }, [settings.customBackground, resolvedMode, activePreset]);

  // Current foreground hex (custom or preset-based)
  const foregroundHex = useMemo(() => {
    if (settings.customForeground) return settings.customForeground;
    return resolvedMode === 'dark' ? activePreset.darkFg : activePreset.lightFg;
  }, [settings.customForeground, resolvedMode, activePreset]);

  // Apply DOM classes and CSS variables whenever theme updates
  useEffect(() => {
    const root = document.documentElement;

    // Apply class on <html>
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedMode);

    // Apply dataset attributes
    root.dataset.theme = resolvedMode;
    root.dataset.accent = settings.accent;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.motion = settings.reducedMotion ? 'reduced' : 'normal';
    root.dataset.fontSize = settings.fontSize;

    // CSS variables
    root.style.setProperty('--accent-color', activeAccent.hex);
    root.style.setProperty('--bg-custom', backgroundHex);
    root.style.setProperty('--fg-custom', foregroundHex);
    root.style.colorScheme = resolvedMode;

    // Persist to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save theme settings:', e);
    }
  }, [resolvedMode, settings, activeAccent.hex, backgroundHex, foregroundHex]);

  const setMode = useCallback((mode: ThemeMode) => {
    setSettings((prev) => ({ ...prev, mode }));
  }, []);

  const setPreset = useCallback((presetId: string) => {
    const targetPreset = THEME_PRESET_OPTIONS.find((p) => p.id === presetId);
    setSettings((prev) => ({
      ...prev,
      preset: presetId,
      customBackground: undefined,
      customForeground: undefined,
      accent: targetPreset?.defaultAccent || prev.accent,
    }));
  }, []);

  const setAccent = useCallback((accentId: string) => {
    setSettings((prev) => ({ ...prev, accent: accentId }));
  }, []);

  const setBackgroundHex = useCallback((hex: string) => {
    setSettings((prev) => ({ ...prev, customBackground: hex }));
  }, []);

  const setForegroundHex = useCallback((hex: string) => {
    setSettings((prev) => ({ ...prev, customForeground: hex }));
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, highContrast: enabled }));
  }, []);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, reducedMotion: enabled }));
  }, []);

  const setFontSize = useCallback((size: 'compact' | 'normal' | 'large') => {
    setSettings((prev) => ({ ...prev, fontSize: size }));
  }, []);

  const resetTheme = useCallback(() => {
    setSettings(DEFAULT_THEME_SETTINGS);
  }, []);

  const value: ThemeContextValue = {
    mode: settings.mode,
    resolvedMode,
    setMode,
    preset: settings.preset,
    setPreset,
    accent: settings.accent,
    setAccent,
    backgroundHex,
    setBackgroundHex,
    foregroundHex,
    setForegroundHex,
    highContrast: settings.highContrast,
    setHighContrast,
    reducedMotion: settings.reducedMotion,
    setReducedMotion,
    fontSize: settings.fontSize,
    setFontSize,
    resetTheme,
    availableAccents: ACCENT_COLOR_OPTIONS,
    availablePresets: THEME_PRESET_OPTIONS,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
