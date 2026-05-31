import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'

  return {
    plugins: [react()],

    server: isDev
      ? {
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
          },
        }
      : {},

    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('react') || id.includes('react-router-dom')) {
              return 'vendor'
            }

            if (id.includes('recharts')) {
              return 'charts'
            }

            if (id.includes('lucide-react')) {
              return 'icons'
            }
          },
        },
      },
    },
  }
})