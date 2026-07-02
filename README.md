# DSPS Care LINE Mini App

React + TypeScript + Vite frontend สำหรับ DSPS Care

## Local development

```bash
cp .env.example .env.local
yarn install
yarn dev
```

ค่าที่ frontend ใช้:

- `VITE_API_URL` — URL ของ backend API
- `VITE_LIFF_ID` — LIFF ID (เป็น public client configuration ไม่ใช่ secret)

Production build ใช้ค่าจาก `.env.production`:

- API: `https://api.dspscare.com`
- LINE callback (ตั้งค่าที่ LINE Developers และ backend): `https://api.dspscare.com/auth/line/callback`

## CI/CD to Plesk

Workflow `.github/workflows/deploy-production.yml` จะ:

1. build ทุก pull request ที่เข้า `main`
2. build และ deploy เมื่อ push เข้า `main`
3. ส่งเฉพาะไฟล์ใน `dist/` ไปที่ `/var/www/vhosts/dspscare.com/httpdocs`

สร้าง GitHub Environment ชื่อ `production` และเพิ่ม Environment secrets:

- `PLESK_SSH_PRIVATE_KEY` — private key ของ deploy key (ไม่มี passphrase)
- `PLESK_SSH_KNOWN_HOSTS` — ผลลัพธ์จาก `ssh-keyscan -H 118.27.146.122`

บัญชี SSH `waiistudio` ต้องเขียน document root ได้ และเซิร์ฟเวอร์ต้องรับ SSH key บน port 22

ไฟล์ `public/.htaccess` ทำให้ React Router เปิด URL ย่อยโดยตรงได้บน Apache/Plesk

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
