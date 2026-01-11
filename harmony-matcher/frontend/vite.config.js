import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prevent duplicate React bundles that cause "Invalid hook call"
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: true,
    port: 4000,
    allowedHosts: [
      'overfragmented-grazyna-underbeaten.ngrok-free.dev'
    ],
    hmr: {
      protocol: 'wss',
      host: 'overfragmented-grazyna-underbeaten.ngrok-free.dev',
      clientPort: 443
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
