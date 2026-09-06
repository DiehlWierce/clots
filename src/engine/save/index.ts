import { STATE_VERSION } from '../state'
import type { GameState } from '../types'
import { decodeText, encodeText } from './codec'
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

export type LoadResult =
  { ok: true; state: GameState } | { ok: false; reason: 'empty' | 'corrupt' | 'incompatible' }

export function decodeSaveCode(code: string): LoadResult {
  if (!code.trim()) return { ok: false, reason: 'empty' }
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeText(code))
  } catch {
    return { ok: false, reason: 'corrupt' }
  }
  return fromUnknown(parsed)
}

export function fromUnknown(parsed: unknown): LoadResult {
  const migrated = migrate(parsed)
  if (!migrated) return { ok: false, reason: 'incompatible' }
  const state = sanitizeState(migrated)
  if (!state) return { ok: false, reason: 'corrupt' }
  return { ok: true, state }
}

// ─── Хранилище браузера ─────────────────────────────────────────────────────

export function persist(state: GameState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state))
  } catch {
    // Приватный режим или переполненное хранилище — игра продолжается в памяти.
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

export { sanitizeState, encodeText, decodeText }
