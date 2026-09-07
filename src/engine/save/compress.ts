/**
 * Сжатие сейва.
 *
 * Код сохранения — base64 от JSON с повторяющимися ключами, он сжимается
 * в разы. Это не только короче для игрока, но и снимает необходимость резать
 * значение на части для облака Telegram, где предел 4096 символов.
 *
 * CompressionStream есть во всех целевых вебвью, но не в Node и не в старых
 * клиентах, поэтому сжатие всегда опционально: несжатый код остаётся
 * читаемым, а формат помечает себя префиксом.
 */

const GZIP_PREFIX = 'HEMZ1-'

export function isCompressionAvailable(): boolean {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    total += value.length
  }
  const out = new Uint8Array(new ArrayBuffer(total))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const restored = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = restored + '='.repeat((4 - (restored.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Сжимает текст. Возвращает null, если сжатие недоступно. */
export async function compressText(text: string): Promise<string | null> {
  if (!isCompressionAvailable()) return null
  try {
    const input = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
    return GZIP_PREFIX + bytesToBase64Url(await streamToBytes(input))
  } catch {
    return null
  }
}

export function isCompressed(code: string): boolean {
  return code.trim().startsWith(GZIP_PREFIX)
}

/** Разжимает код. Возвращает null, если это не сжатый код или разжать нельзя. */
export async function decompressText(code: string): Promise<string | null> {
  const trimmed = code.trim().replace(/\s+/g, '')
  if (!trimmed.startsWith(GZIP_PREFIX)) return null
  if (!isCompressionAvailable()) return null
  try {
    const bytes = base64UrlToBytes(trimmed.slice(GZIP_PREFIX.length))
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new TextDecoder().decode(await streamToBytes(stream))
  } catch {
    return null
  }
}
