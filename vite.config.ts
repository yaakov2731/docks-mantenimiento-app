import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'client',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': { target: 'http://localhost:3001', changeOrigin: true },
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    }
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true
  }
})
