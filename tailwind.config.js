/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Noto Sans Thai"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        primary: {
          DEFAULT: '#006400',
          dark: '#004d00',
          light: '#FFD700',
        },
        accent: {
          DEFAULT: '#FFD700',
          soft: '#FFF8CC',
        }
      }
    },
  },
  plugins: [],
}
