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
          DEFAULT: '#1e3a8a', // สีน้ำเงินเข้ม (เปลี่ยนตามสีโรงเรียนได้ครับ)
          dark: '#1e40af',
          light: '#dbeafe',
        }
      }
    },
  },
  plugins: [],
}