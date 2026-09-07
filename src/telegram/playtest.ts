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
    const params = new URLSearchParams(window.location.search)
    if (params.get(PARAM) === KEY) {
      sessionStorage.setItem(FLAG, '1')
      return true
    }
    return sessionStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}
