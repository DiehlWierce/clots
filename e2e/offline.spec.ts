import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Проверка офлайна.
 *
 * Игра целиком локальна: партия лежит на устройстве, серверу нечего считать.
 * Но без service worker она просто не открывалась без сети — в метро или
 * в самолёте мини-приложение показывало пустой экран. Здесь проверяется, что
 * оболочка приезжает из кэша и в партию можно играть дальше.
 */

/** Дожидается, пока service worker установится и возьмёт страницу под контроль. */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false
    await navigator.serviceWorker.ready
    return navigator.serviceWorker.controller !== null
  })
}

test.describe('офлайн', () => {
  test('игра поднимается без сети уже после первого открытия', async ({ page, context }) => {
    // Самый жёсткий случай: игрок открыл мини-приложение один раз и потерял
    // сеть, ни разу не перезагрузив страницу. Раньше worker кэшировал только
    // оболочку — код и стили в кэш не попадали, и экран оставался пустым.
    await page.goto('./?playtest=hem')
    await page.waitForFunction(
      async () => 'serviceWorker' in navigator && Boolean(await navigator.serviceWorker.ready),
    )

    await context.setOffline(true)
    await page.reload()

    await expect(page.getByRole('dialog').first()).toBeVisible()

    await context.setOffline(false)
  })

  test('игра открывается без сети и партия на месте', async ({ page, context }) => {
    await page.goto('./?playtest=hem')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    const overlay = page.getByRole('dialog').first()
    await expect(overlay).toBeVisible()
    await overlay.getByRole('button').first().click()

    await waitForServiceWorker(page)

    // Ещё одна загрузка — уже под управлением worker'а: только теперь код и
    // стили проходят через него и попадают в кэш.
    await page.reload()
    await waitForServiceWorker(page)

    // Делаем ход, чтобы было что проверять после возвращения.
    await page.getByRole('button', { name: /Завершить цикл/ }).click()
    await expect(page.locator('.hud__meta')).toContainText('Цикл 2')

    const errors: string[] = []
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await context.setOffline(true)
    await page.reload()

    // Интерфейс поднялся из кэша, а партия — из локального хранилища.
    await expect(page.locator('.hud__meta')).toContainText('Цикл 2')
    await expect(page.getByRole('tab', { name: 'Развитие' })).toBeEnabled()

    // И в неё можно играть: ход проходит без сети.
    await page.getByRole('button', { name: /Завершить цикл/ }).click()
    await expect(page.locator('.hud__meta')).toContainText('Цикл 3')

    expect(errors, errors.join('\n')).toEqual([])

    await context.setOffline(false)
  })

  test('ленивая вкладка открывается без сети', async ({ page, context }) => {
    await page.goto('./?playtest=hem')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByRole('dialog').first().getByRole('button').first().click()

    await waitForServiceWorker(page)
    await page.reload()
    await waitForServiceWorker(page)

    // Открываем вкладку до отключения сети: её чанк попадает в кэш.
    await page.getByRole('tab', { name: 'Настройки' }).click()
    await expect(page.getByRole('tab', { name: 'Настройки' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await context.setOffline(true)
    await page.reload()

    await page.getByRole('tab', { name: 'Настройки' }).click()
    await expect(page.getByText('Оформление')).toBeVisible()

    await context.setOffline(false)
  })
})
