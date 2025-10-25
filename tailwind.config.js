/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tokyo: { 500: '#1e40af', 600: '#1b3a99', 700: '#172f7a' }
      }
    }
  },
  plugins: []
}