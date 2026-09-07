import { getWebApp, supports } from './sdk'

/**
 * Облачное хранилище Telegram.
 *
 * Прогресс жил только в localStorage и был привязан к устройству, а
 * мини-приложение открывают и с телефона, и с десктопа. Облако — второй слой:
 * localStorage остаётся быстрым источником, CloudStorage — синхронизацией.
 *
 * API у Telegram колбэчный и доступен с Bot API 6.9; здесь он завёрнут в
 * промисы, а любая недоступность превращается в null, а не в ошибку.
 */

/** Лимит Telegram: значение не длиннее 4096 символов. */
export const CLOUD_VALUE_LIMIT = 4096

/**
 * Запас на служебные символы. Сейв предельно прокачанной партии уже
 * упирается в лимит, поэтому крупные значения пишутся по частям.
 */
export const CLOUD_CHUNK_SIZE = 4000

function storage() {
  if (!supports('6.9')) return null
  return getWebApp()?.CloudStorage ?? null
}

export function isCloudAvailable(): boolean {
  const api = storage()
  return typeof api?.getItem === 'function' && typeof api?.setItem === 'function'
}

export function cloudGet(key: string): Promise<string | null> {
  return new Promise(resolve => {
    const api = storage()
    if (typeof api?.getItem !== 'function') {
      resolve(null)
      return
    }
    try {
      api.getItem(key, (error, value) => {
        resolve(error || !value ? null : value)
      })
    } catch {
      resolve(null)
    }
  })
}

export function cloudSet(key: string, value: string): Promise<boolean> {
  return new Promise(resolve => {
    const api = storage()
    if (typeof api?.setItem !== 'function') {
      resolve(false)
      return
    }
    if (value.length > CLOUD_VALUE_LIMIT) {
      // Молча резать сейв нельзя: лучше честно не сохранить в облако,
      // чем записать половину партии и «восстановить» её потом.
      resolve(false)
      return
    }
    try {
      api.setItem(key, value, error => resolve(!error))
    } catch {
      resolve(false)
    }
  })
}

/**
 * Запись значения любой длины: оно режется на части и складывается в
 * несколько ключей, а рядом пишется их количество.
 *
 * Одного ключа не хватает: сейв полностью прокачанной партии уже превышает
 * лимит Telegram, и с ростом контента разрыв будет только увеличиваться.
 */
export async function cloudSetLarge(baseKey: string, value: string): Promise<boolean> {
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CLOUD_CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CLOUD_CHUNK_SIZE))
  }

  // Счётчик пишется последним: если часть кусков не записалась, читатель
  // увидит старый счётчик и старую партию, а не половину новой.
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    if (chunk === undefined) return false
    const ok = await cloudSet(`${baseKey}_${i}`, chunk)
    if (!ok) return false
  }
  return cloudSet(`${baseKey}_n`, String(chunks.length))
}

/** Чтение значения, записанного по частям. */
export async function cloudGetLarge(baseKey: string): Promise<string | null> {
  const countRaw = await cloudGet(`${baseKey}_n`)
  const count = Number(countRaw)
  if (!Number.isInteger(count) || count <= 0 || count > 32) return null

  const parts: string[] = []
  for (let i = 0; i < count; i += 1) {
    const part = await cloudGet(`${baseKey}_${i}`)
    // Недостающая часть означает повреждённую запись: лучше ничего,
    // чем половина партии, выдаваемая за целую.
    if (part === null) return null
    parts.push(part)
  }
  return parts.join('')
}

export function cloudRemove(key: string): Promise<boolean> {
  return new Promise(resolve => {
    const api = storage()
    if (typeof api?.removeItem !== 'function') {
      resolve(false)
      return
    }
    try {
      api.removeItem(key, error => resolve(!error))
    } catch {
      resolve(false)
    }
  })
}
