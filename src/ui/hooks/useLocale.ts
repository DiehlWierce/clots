import { useCallback, useMemo, useState } from 'react'
import { detectLocale, dictionary, setLocale as persistLocale } from '@/i18n'
import type { Dictionary, Locale } from '@/i18n'

/**
 * Текущий язык интерфейса и способ его сменить.
 *
 * По умолчанию берётся язык Telegram или системы; выбранный вручную
 * запоминается и побеждает автоопределение.
 */
export function useLocale(): {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
} {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)
  const t = useMemo(() => dictionary(locale), [locale])

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next)
    setLocaleState(next)
  }, [])

  return { locale, setLocale, t }
}
