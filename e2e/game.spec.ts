import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Начинает партию с чистого листа и проходит выбор мутации. */
async function startRun(page: Page): Promise<void> {
  // Гейт Telegram обходится тем же ключом, что и при ручной отладке.
  // Параметр указывается явно: относительный переход отбросил бы query.
  await page.goto('./?playtest=hem')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // Партия открывается выбором мутации. Ищем диалог по роли, а не по имени:
  // подпись локализована и меняется вместе со словарём.
  const overlay = page.getByRole('dialog').first()
  await expect(overlay).toBeVisible()
  await overlay.getByRole('button').first().click()
  await expect(overlay).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await startRun(page)
})

test('первый цикл: действие тратит энергию, завершение цикла её возвращает', async ({ page }) => {
  const energy = page.locator('.res--energy .res__value')
  const before = await energy.textContent()

  await page.getByRole('button', { name: /Сбор плазмы/ }).click()
  await expect(energy).not.toHaveText(before ?? '')

  await page.getByRole('button', { name: /Завершить цикл/ }).click()
  // После цикла энергия восстанавливается полностью.
  await expect(page.locator('.hud__meta')).toContainText('Цикл 2')
})

test('вкладки переключаются и ни одна не заблокирована', async ({ page }) => {
  for (const label of ['Карта', 'Развитие', 'Хроника', 'Настройки', 'Штаб']) {
    const tab = page.getByRole('tab', { name: label })
    await expect(tab).toBeEnabled()
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
  }
})

test('захват сектора: схема карты кликабельна, сектор переходит под контроль', async ({ page }) => {
  await page.getByRole('tab', { name: 'Карта' }).click()

  // Выбираем доступный сектор на схеме и занимаем его.
  await page
    .getByRole('button', { name: /Капиллярный пролив/ })
    .first()
    .click()
  const capture = page.getByRole('button', { name: /Занять сектор/ })
  await expect(capture).toBeVisible()
  await capture.click()

  await expect(page.locator('.panel').first()).toContainText('Захвачено 2 из 38')
})

test('бой: оверлей открывается, приём наносит урон, отступление закрывает', async ({ page }) => {
  await page.getByRole('tab', { name: 'Карта' }).click()
  await page
    .getByRole('button', { name: /Капиллярный пролив/ })
    .first()
    .click()
  await page.getByRole('button', { name: /Занять сектор/ }).click()

  await page
    .getByRole('button', { name: /Плетение фибрина/ })
    .first()
    .click()
  await page.getByRole('button', { name: /Штурмовать/ }).click()

  const combat = page.getByRole('dialog').first()
  await expect(combat).toBeVisible()

  const hp = combat.locator('.tag', { hasText: 'HP' })
  const before = await hp.textContent()
  await combat.getByRole('button', { name: /Пульс-удар/ }).click()
  await expect(hp).not.toHaveText(before ?? '')

  await combat.getByRole('button', { name: /Отступить/ }).click()
  await expect(combat).toBeHidden()
})

test('смена темы переключает оформление в обе стороны', async ({ page }) => {
  await page.getByRole('tab', { name: 'Настройки' }).click()

  await page.getByRole('radio', { name: 'Светлая' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('radio', { name: 'Тёмная' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('сохранение: код генерируется и загружается обратно', async ({ page }) => {
  // Делаем ход, чтобы партия отличалась от стартовой.
  await page.getByRole('button', { name: /Сбор плазмы/ }).click()
  await page.getByRole('button', { name: /Завершить цикл/ }).click()

  await page.getByRole('tab', { name: 'Настройки' }).click()
  await page.getByRole('button', { name: /Сгенерировать/ }).click()

  // Код теперь сжимается асинхронно, поэтому поле заполняется не мгновенно.
  const field = page.getByLabel('Код сохранения')
  await expect(field).not.toHaveValue('')
  const code = await field.inputValue()
  expect(code.length).toBeGreaterThan(50)

  await page
    .getByRole('button', { name: /Загрузить/ })
    .first()
    .click()
  await expect(page.locator('.muted', { hasText: 'Сохранение загружено' })).toBeVisible()
})
