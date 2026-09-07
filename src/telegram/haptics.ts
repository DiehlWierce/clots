import { getWebApp, supports } from './sdk'
import type { HapticImpactStyle, HapticNotificationType } from './types'

/**
 * Таптик-отклик.
 *
 * Вне Telegram или на старом клиенте все вызовы — no-op: игра не должна
 * зависеть от наличия вибрации. Отключается настройкой игрока.
 */

const STORAGE_KEY = 'clots:haptics'

let enabled = readPreference()

function readPreference(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function isHapticsEnabled(): boolean {
  return enabled
}

export function setHapticsEnabled(value: boolean): void {
  enabled = value
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off')
  } catch {
    // Приватный режим — настройка живёт только в памяти.
  }
}

function feedback() {
  if (!enabled) return null
  // HapticFeedback появился в Bot API 6.1.
  if (!supports('6.1')) return null
  return getWebApp()?.HapticFeedback ?? null
}

/** Физический отклик разной силы: нажатие, захват, удар. */
export function impact(style: HapticImpactStyle = 'light'): void {
  const haptic = feedback()
  try {
    haptic?.impactOccurred?.(style)
  } catch {
    // ignore
  }
}

/** Отклик результата: успех, предупреждение, ошибка. */
export function notify(type: HapticNotificationType): void {
  const haptic = feedback()
  try {
    haptic?.notificationOccurred?.(type)
  } catch {
    // ignore
  }
}

/** Лёгкий отклик переключения: вкладки, выбор сектора. */
export function selection(): void {
  const haptic = feedback()
  try {
    haptic?.selectionChanged?.()
  } catch {
    // ignore
  }
}

/** Готовые сценарии, чтобы сила отклика была единообразной по всей игре. */
export const haptics = {
  tap: () => impact('light'),
  select: () => selection(),
  capture: () => impact('medium'),
  hit: () => impact('medium'),
  crit: () => impact('heavy'),
  guard: () => impact('soft'),
  damage: () => impact('rigid'),
  success: () => notify('success'),
  warning: () => notify('warning'),
  error: () => notify('error'),
}
