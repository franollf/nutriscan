import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const plugins = [react()];
  
  // Only use mkcert in development, not in production build
  if (mode === 'development') {
    try {
      // Dynamic import to avoid errors in production
      const mkcert = require('vite-plugin-mkcert');
      plugins.push(mkcert.default());
    } catch (e) {
      console.log('mkcert not available, skipping HTTPS');
    }
  }

  return {
    plugins,
    base: '/',
    build: {
      outDir: 'dist',
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
  };
});