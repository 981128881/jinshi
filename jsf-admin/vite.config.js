import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const API = process.env.VITE_API_PROXY || 'http://localhost:3000'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // ponytail: 小内存 ECS 上 gzip 体积统计会在 “modules transformed” 后静默卡死
    reportCompressedSize: false
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API,
        changeOrigin: true,
        ws: true
      },
      '/static': {
        target: API,
        changeOrigin: true
      }
    }
  }
})
