import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build directly into ../public_html WITHOUT wiping the PHP api/ folder.
// emptyOutDir:false preserves public_html/api, robots.txt, .htaccess, sitemap.xml.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public_html',
    emptyOutDir: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] } }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true }
    }
  }
});
