/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Outfit"', '"Inter"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        canvas: '#16161a',
        surface: {
          subtle: '#0f0f13',
          muted: '#111116',
          DEFAULT: '#1c1c22',
          elevated: '#26262e',
          hover: '#2a2a34',
          active: '#30303c',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        accent: {
          ai: '#a78bfa',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
      borderColor: {
        subtle: 'rgba(255, 255, 255, 0.07)',
        DEFAULT: 'rgba(255, 255, 255, 0.11)',
        strong: 'rgba(255, 255, 255, 0.18)',
        focus: 'rgba(139, 92, 246, 0.65)',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.35)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'elevated': '0 12px 36px -4px rgba(0, 0, 0, 0.65)',
        'glow-brand': '0 0 25px -3px rgba(139, 92, 246, 0.35)',
        'glow-subtle': '0 0 20px -3px rgba(99, 102, 241, 0.20)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.25)',
        'focus-ring': '0 0 0 2px rgba(139, 92, 246, 0.40)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
