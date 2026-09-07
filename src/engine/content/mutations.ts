import type { MutationDef } from '../types'

/**
 * Стартовые мутации: перед первым ходом игрок выбирает одну из трёх
 * предложенных. Решение принимается до того, как что-либо произошло, и
 * красит весь забег — это главный источник разнообразия между партиями.
 *
 * Каждая мутация должна быть заметным перекосом, а не мелкой прибавкой:
 * ощутимый плюс всегда оплачен ощутимым минусом.
 */
export const MUTATIONS: MutationDef[] = [
  {
    id: 'thick-blood',
    name: 'Густая кровь',
    tagline: 'Прочнее, но медлительнее',
    description: 'Ядро держит удар заметно лучше, но действий за цикл меньше.',
    effects: { maxIntegrity: 45, defense: 3, maxEnergy: -2 },
  },
  {
    id: 'thin-walls',
    name: 'Тонкие стенки',
    tagline: 'Богато и громко',
    description: 'Русла отдают гораздо больше, но империю слышно вдвое дальше.',
    effects: { plasmaYield: 0.5, clotYield: 0.5 },
    heatMultiplier: 2,
  },
  {
    id: 'mute-signature',
    name: 'Немая сигнатура',
    tagline: 'Незаметно и бедно',
    description: 'Иммунитет почти не реагирует, но эссенция даётся вдвое хуже.',
    effects: { suppression: 0.35, masking: 4, essenceYield: -0.5 },
  },
  {
    id: 'hypercoagulation',
    name: 'Гиперкоагуляция',
    tagline: 'Сгустки вместо потока',
    description: 'Переработка идёт втрое живее, зато плазмы приходит меньше.',
    effects: { clotYield: 0.9, plasmaYield: -0.3 },
  },
  {
    id: 'predatory-pulse',
    name: 'Хищный импульс',
    tagline: 'Бьёт первым и сильно',
    description: 'Цитадель выходит из первого же боя победителем — если выживет.',
    effects: { attack: 9, pierce: 4, maxIntegrity: -30 },
  },
  {
    id: 'branched-network',
    name: 'Разветвлённая сеть',
    tagline: 'Много действий, мало добычи',
    description: 'Больше энергии на цикл ценой общей продуктивности.',
    effects: { maxEnergy: 3, plasmaYield: -0.2, clotYield: -0.2, essenceYield: -0.2 },
  },
  {
    id: 'immune-blindness',
    name: 'Иммунная слепота',
    tagline: 'Редко, но страшно',
    description: 'Угроза растёт вдвое медленнее, но пришедший рейд заметно сильнее.',
    effects: {},
    heatMultiplier: 0.5,
    raidPower: 1.6,
  },
  {
    id: 'crisis-start',
    name: 'Кризисный старт',
    tagline: 'Всё сразу и сразу опасно',
    description: 'Богатый старт, но иммунитет уже смотрит в вашу сторону.',
    effects: {},
    startBonus: { plasma: 260, clots: 90, essence: 8 },
    startThreat: 45,
  },
]

export const MUTATION_BY_ID: ReadonlyMap<string, MutationDef> = new Map(
  MUTATIONS.map(m => [m.id, m]),
)

/** Сколько вариантов предлагается игроку на старте. */
export const MUTATION_OFFER_SIZE = 3
