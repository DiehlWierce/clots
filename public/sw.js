/*
 * Service worker: офлайн-оболочка.
 *
 * Игра пошаговая и полностью локальная — партия хранится на устройстве, — но
 * при потере сети не открывалась вовсе. Здесь кэшируется оболочка: код, стили
 * и иконки. Партия и так локальна, поэтому играть можно без связи целиком, а
 * облако синхронизируется, когда сеть вернётся.
 *
 * Стратегия намеренно простая: свежая версия побеждает, кэш — запасной путь.
 * Так игрок не застревает на старой сборке после обновления игры.
 */

const CACHE = 'clots-shell-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/drop.svg']

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Чужие домены не кэшируем: SDK Telegram обновляется на их стороне.
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then(response => {
        // Кладём в кэш копию: следующий запуск переживёт отсутствие сети.
        const copy = response.clone()
        void caches.open(CACHE).then(cache => cache.put(request, copy))
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        // Навигация без сети и без кэша — отдаём оболочку.
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html')
          if (shell) return shell
        }
        return new Response('Офлайн', { status: 503, statusText: 'Offline' })
      }),
  )
})
