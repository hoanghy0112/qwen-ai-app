import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: './',
  base: './',
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/tts': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts/, '/translate_tts'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('origin');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
          });
        }
      },
      '/api/flows': {
        target: 'http://localhost:7999',
        changeOrigin: true
      },
      '/api/chat': {
        target: 'http://localhost:7999',
        changeOrigin: true
      },
      '/api/cosyvoice': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cosyvoice/, '/tts')
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      // injectManifest lets us ship a custom service worker that handles
      // Web-Push events (the default `generateSW` strategy doesn't).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,vrm,vrma}']
      },
      manifest: {
        name: 'Shinhan SOL Vietnam',
        short_name: 'Shinhan SOL',
        description: 'Shinhan Digital Avatar App',
        theme_color: '#00306b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
