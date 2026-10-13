import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Hostinger Node.js Web Apps expect the build output in `dist/` (relative to
// the root directory `frontend/`). Keep outDir 'dist' so managed deployments
// succeed. For classic shared-hosting (FTP into public_html), run
// `npm run build:shared`, which builds to dist/ then copies into
// ../public_html WITHOUT wiping api/, .htaccess, robots.txt, sitemap.xml.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
