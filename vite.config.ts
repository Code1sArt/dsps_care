import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // LINE's in-app browser can use an older Android System WebView/Safari
    // engine than the desktop browser on the same account.
    target: 'es2018',
  },
  server: {
    // ใส่ '.ngrok-free.dev' เพื่อให้รองรับ URL ของ ngrok ทุกครั้งแม้จะรันใหม่แล้วได้ URL เปลี่ยนไป
    allowedHosts: ['.ngrok-free.dev'],
  }
})
