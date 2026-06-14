import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api-gateway': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-gateway/, '')
      },
      '/spring-api': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/spring-api/, '')
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
