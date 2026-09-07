import type { ContentPack } from './types'

/**
 * Загрузка перевода контента.
 *
 * Русский пакет пуст намеренно: русский текст лежит прямо в
 * src/engine/content и служит эталоном. Пустой пакет означает «показывай как
 * есть», поэтому русскоязычная сборка не грузит ничего дополнительно.
 *
 * Остальные языки подтягиваются по требованию: пакет весит десятки килобайт,
 * и держать его в главном чанке ради игрока, который его не увидит, незачем.
 */
const EMPTY: ContentPack = {}

const LOADERS: Record<string, () => Promise<ContentPack>> = {
  en: () => import('./en').then(module => module.default),
}

const cache = new Map<string, ContentPack>([['ru', EMPTY]])

/** Уже загруженный пакет; для языка, который ещё не приехал, — пустой. */
export function contentPack(locale: string): ContentPack {
  return cache.get(locale) ?? EMPTY
}

/** Загружает пакет языка. Повторные вызовы берут его из кэша. */
export async function loadContentPack(locale: string): Promise<ContentPack> {
  const cached = cache.get(locale)
  if (cached) return cached

  const loader = LOADERS[locale]
  if (!loader) {
    cache.set(locale, EMPTY)
    return EMPTY
  }

  try {
    const pack = await loader()
    cache.set(locale, pack)
    return pack
  } catch {
    // Сеть подвела — играем на эталонном русском, а не показываем пустоту.
    cache.set(locale, EMPTY)
    return EMPTY
  }
}

export type { ContentPack } from './types'
