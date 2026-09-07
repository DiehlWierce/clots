import { enLore } from './en-lore'
import { enMisc } from './en-misc'
import { enProgression } from './en-progression'
import { enWorld } from './en-world'
import type { ContentPack } from './types'

/**
 * Перевод контента по языкам.
 *
 * Русский пакет пуст намеренно: русский текст лежит прямо в src/engine/content
 * и служит эталоном. Пустой пакет означает «показывай как есть» — так игра
 * не ломается, если перевода для какой-то строки нет.
 */
const PACKS: Record<string, ContentPack> = {
  ru: {},
  en: { ...enWorld, ...enProgression, ...enMisc, ...enLore },
}

export function contentPack(locale: string): ContentPack {
  return PACKS[locale] ?? {}
}

export type { ContentPack } from './types'
