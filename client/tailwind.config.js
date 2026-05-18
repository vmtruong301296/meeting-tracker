/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces — auto-flip via CSS vars
        bg:        'rgb(var(--bg) / <alpha-value>)',
        surface:   'rgb(var(--surface) / <alpha-value>)',
        surface2:  'rgb(var(--surface-2) / <alpha-value>)',
        border:    'rgb(var(--border) / <alpha-value>)',
        text:      'rgb(var(--text) / <alpha-value>)',
        muted:     'rgb(var(--muted) / <alpha-value>)',
        accent:    'rgb(var(--accent) / <alpha-value>)',
        accentSoft:'rgb(var(--accent-soft) / <alpha-value>)',
        // Legacy keys still used
        'amber-gold': 'rgb(var(--accent) / <alpha-value>)',
        'amber-deep': 'rgb(var(--accent-2) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
