import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({ target: 'react' }), react()],
  server: {
    port: 5173,
    proxy: {
      '/2026': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})

