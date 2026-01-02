import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: '0.0.0.0',
        allowedHosts: ['salon.callsphere.tech', 'localhost'],
        proxy: {
            '/auth': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/users': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/services': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/stylists': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/appointments': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/customers': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            // Dashboard API (admin stats) at /api/dashboard
            '/api/dashboard': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/calls': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/api/voice': {
                target: 'http://localhost:8086',
                changeOrigin: true,
            },
            '/api/chat': {
                target: 'http://localhost:8086',
                changeOrigin: true,
            },
        },
    },
});
