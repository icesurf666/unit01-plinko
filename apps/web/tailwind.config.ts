import type { Config } from 'tailwindcss';

// Design tokens — semantic names, mirrored from the shared theme.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#9dff00', dim: '#6fbf00' },
        secondary: { DEFAULT: '#8a2be2', soft: '#b98cff' },
        alert: '#ff4e00',
        hi: '#f4ecff',
        mid: '#b7a9d0',
        dim: '#6f6390',
      },
      fontFamily: {
        mono: ['var(--font-mono)'],
        ui: ['var(--font-ui)'],
      },
    },
  },
  plugins: [],
} satisfies Config;
