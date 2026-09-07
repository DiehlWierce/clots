import { useMemo } from 'react'
import { createTranslator } from '@/i18n/content/translate'
import type { ContentTranslator } from '@/i18n/content/translate'
import type { Locale } from '@/i18n'

/** Переводчик контента для текущего языка. */
export function useContent(locale: Locale): ContentTranslator {
  return useMemo(() => createTranslator(locale), [locale])
}
