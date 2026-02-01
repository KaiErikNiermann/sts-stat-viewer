/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // STS-inspired color palette
        ironclad: {
          DEFAULT: '#c62828',
          light: '#ff5f52',
          dark: '#8e0000',
        },
        silent: {
          DEFAULT: '#2e7d32',
          light: '#60ad5e',
          dark: '#005005',
        },
        defect: {
          DEFAULT: '#1565c0',
          light: '#5e92f3',
          dark: '#003c8f',
        },
        watcher: {
          DEFAULT: '#6a1b9a',
          light: '#9c4dcc',
          dark: '#38006b',
        },
        // UI colors
        bg: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
        },
        accent: {
          success: '#22c55e',
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
