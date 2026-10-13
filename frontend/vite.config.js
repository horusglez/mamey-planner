import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Vite's dev server rejects requests whose Host header isn't on this list
    // (anti-DNS-rebinding). Needed when reverse-proxied under a real domain.
    allowedHosts: true,
  },
});
