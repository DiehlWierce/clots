/**
 * Браузерный режим для отладки.
 *
 * Игра рассчитана на Telegram, но проверять её в мини-приложении на каждом
 * изменении невозможно. Поэтому есть скрытый обход гейта: он включается
 * параметром в адресе и запоминается на вкладку.
 *
 * Обычный игрок его не увидит — в интерфейсе нет ни кнопки, ни упоминания:
 * по прямой ссылке он получает экран с переходом в Telegram.
 */

const FLAG = 'clots:playtest'
const PARAM = 'playtest'

/** Ключ включается ссылкой вида ?playtest=hem */
const KEY = 'hem'

export function isPlaytest(): boolean {
  if (typeof window === 'undefined') return false

  try {
    // Обращаемся через window, а не к глобальному sessionStorage: так модуль
    // остаётся проверяемым вне браузера.
    const storage = window.sessionStorage
    const params = new URLSearchParams(window.location.search)
    if (params.get(PARAM) === KEY) {
      storage.setItem(FLAG, '1')
      return true
    }
    return storage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}
