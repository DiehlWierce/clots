import type { EpochModifierDef } from '../types'

/**
 * Эпохи.
 *
 * Каждые N циклов система меняет правила — до конца партии. Лор рассказывал
 * про эпохи, а механика их не отражала: сотый цикл отличался от десятого
 * только величиной чисел. Модификатор накапливается и не отменяется:
 * поздняя игра постепенно становится другой игрой.
 */
export const EPOCH_MODIFIERS: EpochModifierDef[] = [
  {
    id: 'fever',
    name: 'Лихорадка',
    description: 'Температура подскочила: весь урон в бою вырос на четверть — и ваш, и чужой.',
    combatDamage: 1.25,
  },
  {
    id: 'tissue-regeneration',
    name: 'Регенерация тканей',
    description: 'Система латает своих быстрее: враги восстанавливаются вдвое активнее.',
    enemyRegen: 2,
  },
  {
    id: 'thrombosis',
    name: 'Тромбоз',
    description: 'Течение густеет: доход падает на треть, но и угроза растёт вдвое медленнее.',
    incomeMultiplier: 0.66,
    threatMultiplier: 0.5,
  },
  {
    id: 'inflammation',
    name: 'Воспаление',
    description: 'Система в тревоге: угроза растёт в полтора раза быстрее, зато добыча щедрее.',
    threatMultiplier: 1.5,
    incomeMultiplier: 1.3,
  },
  {
    id: 'sclerosis',
    name: 'Склероз сосудов',
    description: 'Русла сужаются: сеть теряет радиус, зато стенки держат удар лучше.',
    effects: { logistics: -2, defense: 6 },
  },
  {
    id: 'adrenal-storm',
    name: 'Адреналиновый шторм',
    description: 'Всё ускоряется: больше энергии на цикл, но иммунитет тоже не спит.',
    effects: { maxEnergy: 2 },
    threatMultiplier: 1.25,
  },
  {
    id: 'anemia',
    name: 'Анемия',
    description: 'Кислорода не хватает всем: цитадель бьёт слабее, но и её замечают реже.',
    effects: { attack: -6, suppression: 0.12 },
  },
  {
    id: 'marrow-bloom',
    name: 'Цветение мозга',
    description: 'Источник работает на пределе: заметно больше плазмы и опыта.',
    effects: { plasmaYield: 0.3, xpYield: 0.25 },
  },
]

export const EPOCH_MODIFIER_BY_ID: ReadonlyMap<string, EpochModifierDef> = new Map(
  EPOCH_MODIFIERS.map(m => [m.id, m]),
)

/** Названия эпох по порядку — для журнала и интерфейса. */
export const EPOCH_NAMES = [
  'Эра Зарождения',
  'Эра Закалки',
  'Эра Давления',
  'Эра Разлома',
  'Эра Сингулярности',
] as const

export function epochName(index: number): string {
  return EPOCH_NAMES[Math.min(index, EPOCH_NAMES.length - 1)] ?? 'Безымянная эра'
}
