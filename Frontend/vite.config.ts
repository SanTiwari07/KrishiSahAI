import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Parent repo root: GEMINI_* for build-time `define` (not exposed as VITE_*).
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  return {
    // Load `Frontend/.env` for VITE_* (matches INSTALLATION.md). Do not use `..` or root `.env` is required instead.
    envDir: path.resolve(__dirname),
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'KrishiSahAI - Farmer Advisory System',
          short_name: 'KrishiSahAI',
          description: 'AI-powered advisory system for farmers',
          theme_color: '#4CAF50',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'https://krishisahai-advisory.web.app/icon_192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://krishisahai-advisory.web.app/icon_512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        filename: 'manifest.json'
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

