import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

/**
 * Конфигурация медленных балансных прогонов.
 *
 * Отдельная и самостоятельная, а не производная от основной: mergeConfig
 * склеивает массивы, и include основного набора подмешивался бы сюда,
 * запуская вместе с симуляциями весь быстрый набор.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.slow.test.ts'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
})
