import type { LoreUnlock, RegionId } from '../types'

/**
 * Структура летописи: идентификаторы и условия открытия.
 *
 * Тексты глав вынесены в lore-text.ts и НЕ реэкспортируются из барреля:
 * движку нужны только правила, а сорок восемь килобайт литературного текста
 * на двух языках не должны попадать в главный чанк ради проверки условия.
 */

export interface LoreChapterMeta {
  id: string
  era: string
  unlock: LoreUnlock
}

export interface LoreEraMeta {
  id: string
  /** Регион, с которым эпоха связана по смыслу; используется только для порядка. */
  region?: RegionId
}

export const LORE_ERAS: LoreEraMeta[] = [
  { id: 'era-origin' },
  { id: 'era-forge' },
  { id: 'era-pressure' },
  { id: 'era-singularity' },
]

export const LORE_CHAPTERS: LoreChapterMeta[] = [
  { id: 'origin-spark', era: 'era-origin', unlock: { kind: 'always' } },
  { id: 'origin-hunger', era: 'era-origin', unlock: { kind: 'sector', value: 'cap-drift' } },
  { id: 'origin-shape', era: 'era-origin', unlock: { kind: 'achievement', value: 'first-module' } },
  { id: 'forge-paths', era: 'era-forge', unlock: { kind: 'achievement', value: 'first-doctrine' } },
  { id: 'forge-gate', era: 'era-forge', unlock: { kind: 'region', value: 'venous' } },
  { id: 'forge-cost', era: 'era-forge', unlock: { kind: 'achievement', value: 'sectors-10' } },
  {
    id: 'pressure-raids',
    era: 'era-pressure',
    unlock: { kind: 'achievement', value: 'first-raid' },
  },
  { id: 'pressure-artery', era: 'era-pressure', unlock: { kind: 'region', value: 'arterial' } },
  { id: 'pressure-barrier', era: 'era-pressure', unlock: { kind: 'sector', value: 'art-nexus' } },
  { id: 'singularity-cortex', era: 'era-singularity', unlock: { kind: 'region', value: 'cortex' } },
  {
    id: 'singularity-throne',
    era: 'era-singularity',
    unlock: { kind: 'sector', value: 'ctx-throne' },
  },
  {
    id: 'singularity-after',
    era: 'era-singularity',
    unlock: { kind: 'achievement', value: 'sovereign' },
  },
]

/** Все главы по порядку — движок проверяет по ним условия открытия. */
export const ALL_CHAPTERS = LORE_CHAPTERS
