/**
 * Сбор ошибок без внешних сервисов.
 *
 * Если у игрока что-то падает, автор об этом не узнает. Здесь последние
 * ошибки складываются в локальное хранилище, а игрок сам решает, отправлять
 * ли отчёт: никакой телеметрии без его ведома.
 */

const STORAGE_KEY = 'clots:errors'
const LIMIT = 10

export interface ErrorRecord {
  at: number
  message: string
  source?: string
}

function read(): ErrorRecord[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as ErrorRecord[]) : []
  } catch {
    return []
  }
}

export function recordError(message: string, source?: string): void {
  if (typeof localStorage === 'undefined') return
  const entry: ErrorRecord = { at: Date.now(), message: message.slice(0, 400) }
  if (source) entry.source = source.slice(0, 200)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...read(), entry].slice(-LIMIT)))
  } catch {
    // Хранилище недоступно — отчёт просто не сохранится.
  }
}

export function listErrors(): ErrorRecord[] {
  return read().slice().reverse()
}

export function clearErrors(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Подписывается на необработанные ошибки страницы. */
export function watchErrors(): () => void {
  if (typeof window === 'undefined') return () => {}

  const onError = (event: ErrorEvent) => {
    recordError(event.message, `${event.filename}:${event.lineno}`)
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason
    recordError(reason instanceof Error ? reason.message : String(reason), 'promise')
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}

/** Текст отчёта для отправки: только техника, без содержимого партии. */
export function buildErrorReport(platform: string, version: string): string {
  const errors = listErrors()
  if (errors.length === 0) return ''
  const lines = [
    `Clots: отчёт об ошибках`,
    `Платформа: ${platform}`,
    `Версия: ${version}`,
    '',
    ...errors.map(
      e => `${new Date(e.at).toISOString()} — ${e.message}${e.source ? ` (${e.source})` : ''}`,
    ),
  ]
  return lines.join('\n')
}
