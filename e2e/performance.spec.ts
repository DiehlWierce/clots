import { expect, test } from '@playwright/test'

/**
 * Замер загрузки.
 *
 * Абсолютные числа зависят от машины, поэтому пороги намеренно щедрые:
 * проверка ловит обвал, а не колебания. Ценность — в тренде, который видно
 * в логах CI от прогона к прогону.
 */
test('первый экран появляется быстро и без ошибок в консоли', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  const started = Date.now()
  await page.goto('./?playtest=hem')

  // Готовность к вводу: выбор мутации — первое, что видит игрок.
  const overlay = page.getByRole('dialog').first()
  await expect(overlay).toBeVisible()
  const interactive = Date.now() - started

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByName('first-contentful-paint')[0]
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      loadComplete: Math.round(nav.loadEventEnd),
      firstPaint: paint ? Math.round(paint.startTime) : null,
      transferred: Math.round(
        performance
          .getEntriesByType('resource')
          .reduce((sum, entry) => sum + (entry as PerformanceResourceTiming).transferSize, 0) /
          1024,
      ),
    }
  })

  console.log(
    `Загрузка: до ввода ${interactive} мс, DOM ${metrics.domContentLoaded} мс, ` +
      `первая отрисовка ${metrics.firstPaint ?? '—'} мс, передано ${metrics.transferred} КБ`,
  )

  expect(interactive, 'первый экран должен появляться меньше чем за 6 секунд').toBeLessThan(6000)
  expect(errors, `ошибки в консоли: ${errors.join('; ')}`).toEqual([])
})

test('переключение языка не роняет игру и подгружает перевод', async ({ page }) => {
  await page.goto('./?playtest=hem')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('dialog').first().getByRole('button').first().click()

  await page.getByRole('tab', { name: 'Настройки' }).click()
  await page.getByRole('radio', { name: 'English' }).click()

  // Пакет перевода приезжает отдельным чанком: ждём, пока надписи сменятся.
  await expect(page.getByRole('tab', { name: 'Command' })).toBeVisible()

  await page.getByRole('radio', { name: 'Русский' }).click()
  await expect(page.getByRole('tab', { name: 'Штаб' })).toBeVisible()
})
