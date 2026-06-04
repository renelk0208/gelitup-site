/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'from-fuchsia-100',
    'to-pink-100',
    'bg-gradient-to-br',
    'from-fuchsia-200',
    'to-pink-200',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
