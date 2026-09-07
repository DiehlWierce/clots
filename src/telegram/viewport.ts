import { call, getWebApp, onEvent, supports } from './sdk'

/**
 * Синхронизация вьюпорта Telegram с CSS-переменными.
 *
 * Мини-приложение живёт в окне переменной высоты и с безопасными зонами,
 * которые Telegram отдаёт числами, а не через env(). Раскладка опирается на
 * эти переменные, поэтому их надо обновлять на каждое изменение вьюпорта.
 */

function px(value: number | undefined, fallback = 0): string {
  return `${Math.max(0, Math.round(value ?? fallback))}px`
}

function sync(): void {
  const app = getWebApp()
  const root = document.documentElement
  if (!app) return

  const height = app.viewportStableHeight ?? app.viewportHeight
  if (height) root.style.setProperty('--tg-viewport', `${Math.round(height)}px`)

  // safeAreaInset — вырезы устройства, contentSafeAreaInset — шапка Telegram.
  const safe = app.safeAreaInset
  const content = app.contentSafeAreaInset
  root.style.setProperty('--tg-safe-top', px((safe?.top ?? 0) + (content?.top ?? 0)))
  root.style.setProperty('--tg-safe-bottom', px((safe?.bottom ?? 0) + (content?.bottom ?? 0)))
  root.style.setProperty('--tg-safe-left', px(safe?.left))
  root.style.setProperty('--tg-safe-right', px(safe?.right))
}

/** Включает синхронизацию. Возвращает функцию отписки. */
export function watchViewport(): () => void {
  if (typeof document === 'undefined') return () => {}
  sync()

  const unsubscribers = [
    onEvent('viewportChanged', sync),
    onEvent('safeAreaChanged', sync),
    onEvent('contentSafeAreaChanged', sync),
  ]

  // Разворачиваем окно: по умолчанию мини-приложение открывается наполовину.
  if (getWebApp()?.isExpanded === false) call('expand')
  if (supports('8.0')) sync()

  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)

  return () => {
    for (const off of unsubscribers) off()
    window.removeEventListener('resize', sync)
    window.removeEventListener('orientationchange', sync)
  }
}
