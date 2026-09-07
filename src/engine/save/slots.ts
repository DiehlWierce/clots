import { BALANCE } from '../balance'
import { serialize } from './index'
import { fromUnknown } from './index'
import type { GameState } from '../types'

/**
 * Автослоты.
 *
 * Сохранение было одно: ошибочный сброс, испорченный сейв или неудачное
 * решение — и вернуться некуда. Три слота с ротацией по циклам дают точку
 * возврата, а стоят дёшево: состояние уже компактное.
 */

export const SLOT_COUNT = 3
export const SLOT_PREFIX = 'clots:slot:'

/** Раз во сколько циклов делается снимок. */
export const SLOT_INTERVAL = 10

export interface SlotInfo {
  index: number
  cycle: number
  sectors: number
  level: number
  savedAt: number
}

interface SlotRecord {
  savedAt: number
  /** Сериализованное состояние — та же строка, что и в основном сейве. */
  state: string
}

function slotKey(index: number): string {
  return `${SLOT_PREFIX}${index}`
}

/** Разбирает сохранённую строку состояния, отбрасывая повреждённые снимки. */
function parseRecord(record: SlotRecord): ReturnType<typeof fromUnknown> | null {
  try {
    return fromUnknown(JSON.parse(record.state))
  } catch {
    return null
  }
}

function readRecord(index: number): SlotRecord | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(slotKey(index))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SlotRecord
    return typeof parsed?.savedAt === 'number' && typeof parsed?.state === 'string' ? parsed : null
  } catch {
    return null
  }
}

/** Нужно ли делать снимок на этом цикле. */
export function shouldSnapshot(cycle: number): boolean {
  return cycle > 1 && cycle % SLOT_INTERVAL === 0
}

/**
 * Записывает снимок в следующий по кругу слот.
 *
 * Слот выбирается по номеру цикла, поэтому три снимка всегда покрывают
 * разные моменты партии, а не три подряд идущих хода.
 */
export function writeSnapshot(state: GameState): boolean {
  if (typeof localStorage === 'undefined') return false
  const index = Math.floor(state.cycle / SLOT_INTERVAL) % SLOT_COUNT
  try {
    // Состояние кладётся строкой: разбирать и снова собирать JSON незачем,
    // а типобезопасно распарсить его здесь всё равно нельзя.
    localStorage.setItem(
      slotKey(index),
      JSON.stringify({ savedAt: Date.now(), state: serialize(state) }),
    )
    return true
  } catch {
    return false
  }
}

/** Краткие сведения о занятых слотах, свежие сверху. */
export function listSnapshots(): SlotInfo[] {
  const out: SlotInfo[] = []
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const record = readRecord(index)
    if (!record) continue
    const result = parseRecord(record)
    if (!result?.ok) continue
    out.push({
      index,
      cycle: result.state.cycle,
      sectors: result.state.controlled.length,
      level: 1,
      savedAt: record.savedAt,
    })
  }
  return out.sort((a, b) => b.savedAt - a.savedAt)
}

/** Читает состояние из слота. */
export function readSnapshot(index: number): GameState | null {
  const record = readRecord(index)
  if (!record) return null
  const result = parseRecord(record)
  return result?.ok ? result.state : null
}

export function clearSnapshots(): void {
  if (typeof localStorage === 'undefined') return
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    try {
      localStorage.removeItem(slotKey(index))
    } catch {
      // ignore
    }
  }
}

/** Сколько места занимают снимки — показывается в настройках. */
export function snapshotsSize(): number {
  if (typeof localStorage === 'undefined') return 0
  let total = 0
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    try {
      total += localStorage.getItem(slotKey(index))?.length ?? 0
    } catch {
      // ignore
    }
  }
  return total
}

/** Предел журнала используется как ориентир размера снимка. */
export const SNAPSHOT_LOG_LIMIT = BALANCE.log.limit
