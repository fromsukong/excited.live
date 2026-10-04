import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api/v1': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart(),
    viteReact(),
  ],
})
