import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // ใส่ '.ngrok-free.dev' เพื่อให้รองรับ URL ของ ngrok ทุกครั้งแม้จะรันใหม่แล้วได้ URL เปลี่ยนไป
    allowedHosts: ['.ngrok-free.dev'],
  }
})
