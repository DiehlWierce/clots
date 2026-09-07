import { defineConfig, devices } from '@playwright/test'

/**
 * E2E-проверки интерфейса.
 *
 * Движок покрыт юнит-тестами хорошо, интерфейс — никак: регрессии вроде
 * «оверлей боя не закрывается» или «вкладка не переключается» ловились
 * только руками. Прогон идёт на мобильном вьюпорте, потому что игра — это
 * мини-приложение Telegram.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // exactOptionalPropertyTypes не допускает undefined, поэтому число задаём всегда.
  workers: process.env.CI ? 1 : 4,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/clots/',
    // Язык фиксируется явно: интерфейс локализован, и без этого селекторы
    // зависели бы от языка машины, на которой идёт прогон.
    locale: 'ru-RU',
    trace: 'on-first-retry',
  },
  projects: [
    {
      // Chromium: на нём же работает вебвью Telegram под Android,
      // и он не тянет отдельную загрузку WebKit в CI.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/clots/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
