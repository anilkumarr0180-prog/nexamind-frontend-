import type { AccentColorOption, ThemePresetOption, ThemeSettings } from './types';

export const THEME_STORAGE_KEY = 'nexamind_appearance_settings_v1';

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  { id: 'blue', name: 'Blue', hex: '#3b82f6', twClass: 'bg-blue-500' },
  { id: 'purple', name: 'Purple', hex: '#8b5cf6', twClass: 'bg-purple-500' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981', twClass: 'bg-emerald-500' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e', twClass: 'bg-rose-500' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b', twClass: 'bg-amber-500' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4', twClass: 'bg-cyan-500' },
];

export const THEME_PRESET_OPTIONS: ThemePresetOption[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    label: 'ChatGPT',
    darkBg: '#000000',
    lightBg: '#ffffff',
    darkFg: '#ededed',
    lightFg: '#171717',
    defaultAccent: 'blue',
  },
  {
    id: 'nexamind',
    name: 'NexaMind',
    label: 'NexaMind',
    darkBg: '#16161a',
    lightBg: '#ffffff',
    darkFg: '#e8e8f0',
    lightFg: '#111827',
    defaultAccent: 'purple',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    label: 'Midnight',
    darkBg: '#0a0a0f',
    lightBg: '#f8fafc',
    darkFg: '#f1f5f9',
    lightFg: '#0f172a',
    defaultAccent: 'blue',
  },
  {
    id: 'oled',
    name: 'OLED Black',
    label: 'OLED Black',
    darkBg: '#000000',
    lightBg: '#ffffff',
    darkFg: '#ffffff',
    lightFg: '#000000',
    defaultAccent: 'emerald',
  },
  {
    id: 'nordic',
    name: 'Nordic Frost',
    label: 'Nordic Frost',
    darkBg: '#0f172a',
    lightBg: '#f8fafc',
    darkFg: '#f8fafc',
    lightFg: '#1e293b',
    defaultAccent: 'cyan',
  },
];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'dark',
  preset: 'chatgpt',
  accent: 'blue',
  highContrast: false,
  reducedMotion: false,
  fontSize: 'normal',
};
