import { useEffect, useMemo, useState } from 'react'
import { contentPack, loadContentPack } from '@/i18n/content'
import { createTranslator } from '@/i18n/content/translate'
import type { ContentPack } from '@/i18n/content'
import type { ContentTranslator } from '@/i18n/content/translate'
import type { Locale } from '@/i18n'

/**
 * Переводчик контента для текущего языка.
 *
 * Пакет перевода приезжает отдельным чанком, поэтому до его загрузки
 * используется пустой пакет: игра показывает эталонный русский текст и
 * остаётся играбельной, а надписи меняются, как только пакет пришёл.
 */
export function useContent(locale: Locale): ContentTranslator {
  // Держим сам пакет, а не флаг: так состояние отражает то, что реально
  // загружено, и не требует синхронного setState внутри эффекта.
  const [pack, setPack] = useState<ContentPack>(() => contentPack(locale))

  useEffect(() => {
    let cancelled = false
    void loadContentPack(locale).then(loaded => {
      if (!cancelled) setPack(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  return useMemo(() => createTranslator(pack), [pack])
}
