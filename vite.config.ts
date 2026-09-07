/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/clots/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'node',
    // Медленные балансные прогоны вынесены отдельно: они занимают десятки
    // секунд и не должны гейтить каждый коммит.
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.slow.test.ts', 'node_modules/**'],
    coverage: { provider: 'v8', include: ['src/engine/**'] },
  },
})
