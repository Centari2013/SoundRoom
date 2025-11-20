import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const ADMIN_ROOT = path.resolve(__dirname, 'admin_ingest')

export default defineConfig({
  root: ADMIN_ROOT,
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(ADMIN_ROOT, 'src'),
      '@app': path.resolve(__dirname, 'src')
    }
  },
  envDir: __dirname,
  server: {
    port: 4175,
    strictPort: false,
    proxy: {
      // When running `vercel dev` (port 3000) alongside the Vite admin ingest dev server
      // (port 4175), forward API requests to the backend so relative /api calls work.
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: path.resolve(ADMIN_ROOT, 'dist'),
    emptyOutDir: true
  }
})
