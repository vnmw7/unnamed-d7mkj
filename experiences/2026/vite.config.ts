import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/2026/',
  server: {
    port: 5174,
  },
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})

