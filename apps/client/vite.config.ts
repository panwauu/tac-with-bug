import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  // Load root package.json version so CLIENT builds use the repo root version
  // instead of the client's package.json (npm sets npm_package_version to the
  // local package when running scripts inside the client folder).
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')).version),
  },
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
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@repo/core': resolve(__dirname, '../../packages/core/src'),
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
})
