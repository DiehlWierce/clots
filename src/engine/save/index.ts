import { STATE_VERSION } from '../state'
import type { GameState } from '../types'
import { decodeText, encodeText } from './codec'
import { compressText, decompressText, isCompressed } from './compress'
import { migrate } from './migrate'
import { sanitizeState } from './schema'

export const STORAGE_KEY = 'clots:hem-empire:v2'

export { STORAGE_KEY as SAVE_STORAGE_KEY }

/**
 * Что попадает в сейв: только состояние партии. Весь статический контент
 * (названия, стоимости, описания) остаётся в коде — поэтому сейв компактный
 * и обновление баланса доходит до уже играющих.
 */
function toPayload(state: GameState): Record<string, unknown> {
  const { log: _log, ...rest } = state
  return { ...rest, version: STATE_VERSION }
}

export function serialize(state: GameState): string {
  return JSON.stringify(toPayload(state))
}

/** Код сохранения для копирования: без журнала, компактный, URL-safe. */
export function encodeSaveCode(state: GameState): string {
  return encodeText(serialize(state))
}

/**
 * Сжатый код сохранения. Сжатие в разы короче, но доступно не везде,
 * поэтому при его отсутствии возвращается обычный код — он читается тем же
 * декодером, и игрок разницы не замечает.
 */
export async function encodeSaveCodeCompressed(state: GameState): Promise<string> {
  const compressed = await compressText(serialize(state))
  return compressed ?? encodeText(serialize(state))
}

export type LoadResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: 'empty' | 'corrupt' | 'incompatible' | 'compressed' }

export function decodeSaveCode(code: string): LoadResult {
  if (!code.trim()) return { ok: false, reason: 'empty' }
  // Сжатый код читается только асинхронно: подсказываем это вызывающему,
  // а не делаем вид, что он повреждён.
  if (isCompressed(code)) return { ok: false, reason: 'compressed' }
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeText(code))
  } catch {
    return { ok: false, reason: 'corrupt' }
  }
  return fromUnknown(parsed)
}

/** Читает код любого вида — сжатый и обычный. */
export async function decodeSaveCodeAsync(code: string): Promise<LoadResult> {
  if (!code.trim()) return { ok: false, reason: 'empty' }
  if (isCompressed(code)) {
    const text = await decompressText(code)
    if (text === null) return { ok: false, reason: 'corrupt' }
    try {
      return fromUnknown(JSON.parse(text))
    } catch {
      return { ok: false, reason: 'corrupt' }
    }
  }
  return decodeSaveCode(code)
}

export function fromUnknown(parsed: unknown): LoadResult {
  const migrated = migrate(parsed)
  if (!migrated) return { ok: false, reason: 'incompatible' }
  const state = sanitizeState(migrated)
  if (!state) return { ok: false, reason: 'corrupt' }
  return { ok: true, state }
}

// ─── Хранилище браузера ─────────────────────────────────────────────────────

/**
 * Записывает партию на устройство.
 *
 * Возвращает признак успеха, а не глушит ошибку молча: если хранилище
 * запрещено или переполнено, игрок должен об этом узнать и успеть скопировать
 * код партии. Молчаливая потеря прогресса хуже честного предупреждения.
 */
export function persist(state: GameState): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state))
    return true
  } catch {
    return false
  }
}

export function loadPersisted(): GameState | null {
  if (typeof localStorage === 'undefined') return null
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const result = fromUnknown(JSON.parse(raw))
    return result.ok ? result.state : null
  } catch {
    return null
  }
}

export function clearPersisted(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export {
  SLOT_COUNT,
  SLOT_INTERVAL,
  clearSnapshots,
  listSnapshots,
  readSnapshot,
  shouldSnapshot,
  writeSnapshot,
} from './slots'
export type { SlotInfo } from './slots'
export { compressText, decompressText, isCompressed, isCompressionAvailable } from './compress'
export { sanitizeState, encodeText, decodeText }
export { CLOUD_KEY, compareSaves, toCloudPayload, fromCloudPayload } from './sync'
export type { SyncDecision } from './sync'
