export type ThemeMode = 'system' | 'light' | 'dark';

export type ResolvedMode = 'light' | 'dark';

export interface AccentColorOption {
  id: string;
  name: string;
  hex: string;
  twClass: string;
}

export interface ThemePresetOption {
  id: string;
  name: string;
  label: string;
  darkBg: string;
  lightBg: string;
  darkFg: string;
  lightFg: string;
  defaultAccent: string;
}

export interface ThemeSettings {
  mode: ThemeMode;
  preset: string;
  accent: string;
  customBackground?: string;
  customForeground?: string;
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'compact' | 'normal' | 'large';
}

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedMode;
  setMode: (mode: ThemeMode) => void;
  preset: string;
  setPreset: (presetId: string) => void;
  accent: string;
  setAccent: (accentId: string) => void;
  backgroundHex: string;
  setBackgroundHex: (hex: string) => void;
  foregroundHex: string;
  setForegroundHex: (hex: string) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  fontSize: 'compact' | 'normal' | 'large';
  setFontSize: (size: 'compact' | 'normal' | 'large') => void;
  resetTheme: () => void;
  availableAccents: AccentColorOption[];
  availablePresets: ThemePresetOption[];
}
