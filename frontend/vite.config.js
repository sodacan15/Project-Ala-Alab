import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/bridge': 'http://localhost:3001',
      '/session': 'http://localhost:3001',
      '/clipboard': 'http://localhost:3001',
      '/contexts': 'http://localhost:3001',
      '/indexer': 'http://localhost:3001',
      '/accounts': 'http://localhost:3001',
      '/storage': 'http://localhost:3001'
    }
  }
});
