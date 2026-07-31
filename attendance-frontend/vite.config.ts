import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Versión única de producto: se lee del package.json y se inyecta en el bundle,
// para que la pantalla de login no la lleve escrita a mano y se desincronice.
const { version } = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:80',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
