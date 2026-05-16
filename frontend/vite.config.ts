import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/CarePath/',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Use 127.0.0.1 (not "localhost") — on Windows, Node 18+ resolves
        // localhost to ::1 (IPv6) first while `php artisan serve` only
        // binds IPv4, which causes ECONNREFUSED.
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
