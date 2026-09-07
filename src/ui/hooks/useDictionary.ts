import { useMemo } from 'react'
import { detectLocale, dictionary } from '@/i18n'
import type { Dictionary, Locale } from '@/i18n'

/** Словарь интерфейса для текущего языка. */
export function useDictionary(locale?: Locale): Dictionary {
  return useMemo(() => dictionary(locale ?? detectLocale()), [locale])
}
