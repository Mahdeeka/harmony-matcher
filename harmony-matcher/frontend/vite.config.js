import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const ngrokHost = process.env.NGROK_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: true,
    port: 4000,
    allowedHosts: ngrokHost ? [ngrokHost] : [],
    ...(ngrokHost && {
      hmr: {
        protocol: 'wss',
        host: ngrokHost,
        clientPort: 443
      }
    }),
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
