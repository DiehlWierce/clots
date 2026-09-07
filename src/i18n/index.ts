import { getWebApp } from '@/telegram'
import { en } from './en'
import { ru } from './ru'
import type { Dictionary } from './ru'

export type Locale = 'ru' | 'en'

const DICTIONARIES: Record<Locale, Dictionary> = { ru, en }

const STORAGE_KEY = 'clots:locale'

/**
 * Определение языка.
 *
 * Telegram отдаёт язык пользователя в initDataUnsafe, но объект не всегда
 * доступен, поэтому дальше идёт язык браузера, а по умолчанию — русский:
 * контент игры написан на нём.
 */
export function detectLocale(): Locale {
  const stored = readStored()
  if (stored) return stored

  const app = getWebApp() as { initDataUnsafe?: { user?: { language_code?: string } } } | null
  const fromTelegram = app?.initDataUnsafe?.user?.language_code
  const candidate = fromTelegram ?? (typeof navigator !== 'undefined' ? navigator.language : '')
  return candidate.toLowerCase().startsWith('en') ? 'en' : 'ru'
}

function readStored(): Locale | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'ru' || raw === 'en' ? raw : null
  } catch {
    return null
  }
}

/** Языки, доступные игроку. */
export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
]

/** Язык, выбранный игроком вручную, или null — если следуем системе. */
export function readStoredLocale(): Locale | null {
  return readStored()
}

export function setLocale(locale: Locale): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignore
  }
}

export function dictionary(locale: Locale = detectLocale()): Dictionary {
  return DICTIONARIES[locale]
}

export type { Dictionary }
