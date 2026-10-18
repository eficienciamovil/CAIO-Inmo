/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0b0b0d', 900: '#121216', 850: '#17171c', 800: '#1d1d24', 700: '#2a2a33', 600: '#3a3a45' },
        gold: { 300: '#ecd69a', 400: '#d9b968', 500: '#c9a24b', 600: '#a8843a' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
