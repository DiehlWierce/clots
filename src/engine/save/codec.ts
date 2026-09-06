/**
 * Кодирование сейва в текстовый код.
 *
 * Прошлая версия делала btoa(encodeURIComponent(json)), что на кириллице
 * раздувало результат в 2.2 раза: каждый символ превращался в «%D0%BF», а потом
 * ещё раз в base64. Здесь строка кодируется в UTF-8 байты честно, через
 * TextEncoder, — тот же сейв выходит вдвое короче и не зависит от локали.
 */

const CODE_PREFIX = 'HEM1-'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** URL-safe base64 без набивки: код можно переслать ссылкой или в мессенджере. */
function toUrlSafe(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromUrlSafe(value: string): string {
  const restored = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (restored.length % 4)) % 4
  return restored + '='.repeat(padding)
}

export function encodeText(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return CODE_PREFIX + toUrlSafe(bytesToBase64(bytes))
}

export function decodeText(code: string): string {
  const trimmed = code.trim().replace(/\s+/g, '')
  const payload = trimmed.startsWith(CODE_PREFIX) ? trimmed.slice(CODE_PREFIX.length) : trimmed
  if (payload.length === 0) throw new Error('Пустой код сохранения')
  return new TextDecoder().decode(base64ToBytes(fromUrlSafe(payload)))
}
