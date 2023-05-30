import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import eslintPlugin from 'vite-plugin-eslint'
import Checker from 'vite-plugin-checker'
import path from 'path'
import loadVersion from 'vite-plugin-package-version'

export default defineConfig({
  plugins: [vue(), eslintPlugin(), Checker({ vueTsc: true }), loadVersion()],
  server: {
    port: 8080,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/gameApi': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 8081,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/gameApi': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
})
