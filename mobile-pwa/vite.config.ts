import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/game/',
  plugins: [react()],
  server: {
    // 固定调试端口与主机：直接 `npm run dev` 即可，不必再手写 --port/--host
    port: 5199,
    host: '127.0.0.1',
    strictPort: true,
  },
  // 预览（npm run preview）走同一套端口约定，避免与开发端口冲突
  preview: {
    port: 5201,
    host: '127.0.0.1',
  },
})
