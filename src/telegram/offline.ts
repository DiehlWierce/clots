/**
 * Регистрация офлайн-оболочки.
 *
 * Работает только в продакшен-сборке: в разработке service worker кэширует
 * модули и мешает горячей перезагрузке.
 */
export function registerOffline(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return

  window.addEventListener('load', () => {
    // Путь относительный: игра живёт в подкаталоге на GitHub Pages.
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Отсутствие офлайна не мешает играть онлайн.
    })
  })
}
