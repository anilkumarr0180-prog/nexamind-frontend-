/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        canvas: '#090a0f',
        surface: {
          muted: '#0d0f15',
          DEFAULT: '#11131a',
          elevated: '#161923',
          hover: '#1c202d',
          active: '#222738',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          ai: '#818cf8',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
      borderColor: {
        subtle: 'rgba(255, 255, 255, 0.06)',
        DEFAULT: 'rgba(255, 255, 255, 0.10)',
        strong: 'rgba(255, 255, 255, 0.16)',
        focus: 'rgba(99, 102, 241, 0.60)',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'card': '0 4px 16px -2px rgba(0, 0, 0, 0.45)',
        'elevated': '0 12px 32px -4px rgba(0, 0, 0, 0.65)',
        'glow-brand': '0 0 20px -3px rgba(99, 102, 241, 0.20)',
        'focus-ring': '0 0 0 2px rgba(99, 102, 241, 0.35)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
