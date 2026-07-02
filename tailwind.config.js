/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
