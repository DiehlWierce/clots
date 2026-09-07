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
    /*
     * Карты создаются для разбора ошибок, но браузер их не запрашивает:
     * полтора мегабайта не уезжают в раздачу и не светят исходники.
     */
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        /*
         * Библиотеки отдельно от кода: React и Immer меняются раз в месяцы,
         * а контент и правила — постоянно. Без разделения любая правка
         * опечатки заставляла игрока перекачивать весь бандл целиком.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react')) return 'vendor-react'
          if (id.includes('immer') || id.includes('zustand')) return 'vendor-state'
          return 'vendor'
        },
      },
    },
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
