import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'

  return {
    plugins: [react()],

    server: isDev ? {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      }
    } : {},

    build: {
      outDir:    'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:   ['react', 'react-dom', 'react-router-dom'],
            charts:   ['recharts'],
            icons:    ['lucide-react'],
          }
        }
      }
    }
  }
})