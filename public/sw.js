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

const CACHE = 'clots-shell-v2'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/drop.svg']

/*
 * Код и стили нужно положить в кэш прямо при установке.
 *
 * Раньше в SHELL были только оболочка и иконки: имена собранных файлов
 * содержат хеш и заранее неизвестны. Всё остальное попадало в кэш лишь
 * попутно — при запросах, прошедших через worker. Но на первом открытии
 * worker ещё не управляет страницей, поэтому игрок, потерявший сеть до
 * следующего захода, получал пустой экран.
 *
 * Список берётся из самой index.html: имена с хешами читаются из её
 * <script> и <link>, и build-шаг для этого не нужен. Лениво подгружаемые
 * вкладки в разметке не упомянуты — они кэшируются при первом открытии.
 */
async function precache() {
  const cache = await caches.open(CACHE)
  await Promise.all(SHELL.map(url => cache.add(url).catch(() => undefined)))

  try {
    const response = await fetch('./index.html', { cache: 'reload' })
    if (!response.ok) return
    const html = await response.text()
    await cache.put('./index.html', new Response(html, { headers: response.headers }))

    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map(match => match[1])
      .filter(url => url.startsWith('./') || url.startsWith('/'))
    await Promise.all(assets.map(url => cache.add(url).catch(() => undefined)))
  } catch {
    // Установка без сети — не повод падать: докэшируем при первом запросе.
  }
}

self.addEventListener('install', event => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
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
        // ignoreVary обязателен: ответы сервера приходят с заголовком Vary,
        // и без него запрос модуля не совпадал с тем же файлом в кэше —
        // офлайн отдавалась 503, хотя файл лежал рядом.
        const cached = await caches.match(request, { ignoreVary: true })
        if (cached) return cached
        // Навигация без сети и без кэша — отдаём оболочку. Строка запроса
        // при этом не важна: ?playtest и прочее не меняют саму оболочку.
        if (request.mode === 'navigate') {
          const shell =
            (await caches.match(request, { ignoreSearch: true, ignoreVary: true })) ??
            (await caches.match('./index.html', { ignoreVary: true }))
          if (shell) return shell
        }
        return new Response('Офлайн', { status: 503, statusText: 'Offline' })
      }),
  )
})
