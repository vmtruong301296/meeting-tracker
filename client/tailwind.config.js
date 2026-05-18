/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0a0a0b', 900: '#15151a', 800: '#1f1f24' },
        cream: { 100: '#e8e6e0', 200: '#d4d2cc' },
        amber: { gold: '#d4a574', deep: '#8b6841' },
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
