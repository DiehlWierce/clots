import type { TelegramWebApp } from './types'

/**
 * Доступ к Telegram WebApp.
 *
 * Правило модуля: игра обязана работать, даже если SDK не загрузился или
 * клиент старой версии. Поэтому наружу торчат только безопасные обёртки,
 * а не сам объект WebApp.
 */

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}

/**
 * Запущены ли мы внутри Telegram.
 *
 * Наличие window.Telegram.WebApp недостаточно: скрипт SDK определяет объект
 * и в обычном браузере. Настоящий признак — непустой initData или известная
 * платформа, отличная от 'unknown'.
 */
export function isTelegram(): boolean {
  const app = getWebApp()
  if (!app) return false
  const platform = app.platform ?? 'unknown'
  return platform !== 'unknown' || (app.initData ?? '').length > 0
}

export function supports(version: string): boolean {
  const app = getWebApp()
  if (!app?.isVersionAtLeast) return false
  try {
    return app.isVersionAtLeast(version)
  } catch {
    return false
  }
}

/** Безопасный вызов метода SDK: любая ошибка гасится, игра продолжается. */
export function call<K extends keyof TelegramWebApp>(
  method: K,
  ...args: TelegramWebApp[K] extends ((...a: infer A) => unknown) | undefined ? A : never
): void {
  const app = getWebApp()
  const fn = app?.[method]
  if (typeof fn !== 'function') return
  try {
    ;(fn as (...a: unknown[]) => unknown).apply(app, args)
  } catch {
    // Старый клиент или метод недоступен — молча продолжаем.
  }
}

/**
 * Готовит мини-приложение: разворачивает на весь экран, отключает
 * вертикальные свайпы (иначе прокрутка карты закрывает приложение)
 * и фиксирует ориентацию.
 */
export function initWebApp(): void {
  const app = getWebApp()
  if (!app) return
  call('ready')
  call('expand')
  // Свайп вниз в Telegram закрывает мини-приложение. В игре много длинных
  // прокручиваемых списков, поэтому жест обязательно отключаем.
  if (supports('7.7')) call('disableVerticalSwipes')
  if (supports('8.0')) call('lockOrientation')
}

/** Подписка на событие SDK. Возвращает функцию отписки. */
export function onEvent(event: string, handler: () => void): () => void {
  const app = getWebApp()
  if (!app?.onEvent) return () => {}
  try {
    app.onEvent(event, handler)
  } catch {
    return () => {}
  }
  return () => {
    try {
      app.offEvent?.(event, handler)
    } catch {
      // ignore
    }
  }
}
