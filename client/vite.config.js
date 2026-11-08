import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true, // accept preview/proxy hosts (e.g. *.e2b.app)
    proxy: {
      // Relative /api calls from the browser are proxied to the API server,
      // so the preview works without hard-coding hosts.
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: { host: '0.0.0.0', port: 5173 },
});
