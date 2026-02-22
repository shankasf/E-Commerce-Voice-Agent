import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['salon.callsphere.tech', 'localhost'],
    // Note: API routing is handled by k3s ingress in production
    // These proxies are only used for local development
    proxy: {
      '/auth': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/users': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/services': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/stylists': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/appointments': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/customers': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/dashboard': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/voice': {
        target: process.env.VITE_AI_URL || 'http://localhost:8086',
        changeOrigin: true,
      },
      '/api/chat': {
        target: process.env.VITE_AI_URL || 'http://localhost:8086',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/calls': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
