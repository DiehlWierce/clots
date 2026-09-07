import { TELEGRAM_BOT_URL } from '@/config'
import { getWebApp, supports } from './sdk'
import type { GameState } from '@/engine/types'

/**
 * Отправка итога забега.
 *
 * Игра живёт в мессенджере, но результат из неё не выходил — самый дешёвый
 * канал распространения не использовался. Полноценный shareMessage требует
 * подготовленного на сервере сообщения, поэтому здесь используется обычная
 * ссылка «поделиться»: она работает на любом клиенте и без бэкенда.
 */

export function buildRunSummary(state: GameState, sectorsTotal: number): string {
  const outcome = state.phase === 'victory' ? 'Империя выстояла' : 'Империя пала'
  const lines = [
    `Clots: Hem Empire — ${outcome}`,
    `Циклов: ${state.cycle}`,
    `Секторов: ${state.controlled.length} из ${sectorsTotal}`,
    `Побед в боях: ${state.stats.battlesWon}, рейдов отбито: ${state.stats.raidsSurvived}`,
  ]
  if (state.ngPlus > 0) lines.push(`Цикл ${state.ngPlus + 1}-го порядка`)
  return lines.join('\n')
}

/** Ссылка «поделиться» Telegram: текст + ссылка на мини-приложение. */
export function buildShareUrl(summary: string): string {
  const params = new URLSearchParams({ url: TELEGRAM_BOT_URL, text: summary })
  return `https://t.me/share/url?${params.toString()}`
}

export function shareRun(state: GameState, sectorsTotal: number): boolean {
  const url = buildShareUrl(buildRunSummary(state, sectorsTotal))
  const app = getWebApp()

  // openTelegramLink открывает диалог выбора чата, не закрывая мини-приложение.
  if (supports('6.1') && typeof app?.openTelegramLink === 'function') {
    try {
      app.openTelegramLink(url)
      return true
    } catch {
      // Падаем на обычное открытие ссылки.
    }
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener')
    return true
  }
  return false
}
