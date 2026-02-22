import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    host: true,
    allowedHosts: ['healthcare.callsphere.tech', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://healthcare-backend:3005',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://healthcare-ai:8084',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
