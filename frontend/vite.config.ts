import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const apiProxy = {
  '/api': {
    target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: apiProxy,
    allowedHosts: true,
  },
  preview: {
    proxy: apiProxy,
    allowedHosts: true,
  },
})