import type { ContentPack } from './types'

/**
 * Доступ к переводу контента.
 *
 * Возвращает переведённое значение или исходное, если перевода нет.
 * Такой подход не требует держать оба языка синхронными построчно:
 * непереведённая строка остаётся русской, а не исчезает.
 */
export interface ContentTranslator {
  sector: (id: string, field: 'name' | 'description', fallback: string) => string
  region: (id: string, field: 'name' | 'subtitle' | 'description', fallback: string) => string
  enemy: (id: string, field: 'name' | 'title' | 'description', fallback: string) => string
  intent: (id: string, field: 'label' | 'description', fallback: string) => string
  module: (id: string, field: 'name' | 'description' | 'branch', fallback: string) => string
  doctrine: (id: string, field: 'name' | 'description', fallback: string) => string
  doctrinePath: (id: string, field: 'name' | 'motto' | 'description', fallback: string) => string
  tech: (id: string, field: 'name' | 'description' | 'branch', fallback: string) => string
  mutation: (id: string, field: 'name' | 'tagline' | 'description', fallback: string) => string
  achievement: (id: string, field: 'title' | 'description', fallback: string) => string
  event: (id: string, field: 'title' | 'text', fallback: string) => string
  eventOption: (id: string, field: 'label' | 'outcome', fallback: string) => string
  epoch: (id: string, field: 'name' | 'description', fallback: string) => string
  epochName: (index: number, fallback: string) => string
  sectorType: (id: string, fallback: string) => string
  vaultOption: (id: string, field: 'label' | 'description', fallback: string) => string
  loreEra: (id: string, field: 'title' | 'period' | 'summary', fallback: string) => string
  loreChapterTitle: (id: string, fallback: string) => string
  loreChapterParagraphs: (id: string, fallback: readonly string[]) => readonly string[]
}

/** Достаёт строку из таблицы перевода; при отсутствии возвращает исходную. */
function pick(
  table: Record<string, Partial<Record<string, string | string[]>>> | undefined,
  id: string,
  field: string,
  fallback: string,
): string {
  const value = table?.[id]?.[field]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

/** Принимает готовый пакет: загрузкой занимается вызывающая сторона. */
export function createTranslator(pack: ContentPack): ContentTranslator {
  return {
    sector: (id, field, fallback) => pick(pack.sectors, id, field, fallback),
    region: (id, field, fallback) => pick(pack.regions, id, field, fallback),
    enemy: (id, field, fallback) => pick(pack.enemies, id, field, fallback),
    intent: (id, field, fallback) => pick(pack.intents, id, field, fallback),
    module: (id, field, fallback) => pick(pack.modules, id, field, fallback),
    doctrine: (id, field, fallback) => pick(pack.doctrines, id, field, fallback),
    doctrinePath: (id, field, fallback) => pick(pack.doctrinePaths, id, field, fallback),
    tech: (id, field, fallback) => pick(pack.techs, id, field, fallback),
    mutation: (id, field, fallback) => pick(pack.mutations, id, field, fallback),
    achievement: (id, field, fallback) => pick(pack.achievements, id, field, fallback),
    event: (id, field, fallback) => pick(pack.events, id, field, fallback),
    eventOption: (id, field, fallback) => pick(pack.eventOptions, id, field, fallback),
    epoch: (id, field, fallback) => pick(pack.epochs, id, field, fallback),
    epochName: (index, fallback) => pack.epochNames?.[String(index)] ?? fallback,
    sectorType: (id, fallback) => pack.sectorTypes?.[id] ?? fallback,
    vaultOption: (id, field, fallback) => pick(pack.vaultOptions, id, field, fallback),
    loreEra: (id, field, fallback) => pick(pack.loreEras, id, field, fallback),
    loreChapterTitle: (id, fallback) => pack.loreChapters?.[id]?.title ?? fallback,
    loreChapterParagraphs: (id, fallback) => pack.loreChapters?.[id]?.paragraphs ?? fallback,
  }
}
