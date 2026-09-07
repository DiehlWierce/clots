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
    // Замер показал доминирование (83% побед против 0% у слабейших):
    // выживаемость — самый ценный ресурс, и её цена была занижена.
    effects: { maxIntegrity: 26, defense: 2, maxEnergy: -2 },
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
    description: 'Переработка идёт втрое живее, а плотная кровь сама затягивает раны.',
    // Прежний набор не давал ничего для выживания и не выигрывал ни разу:
    // экономика сгустков не конвертировалась в способность держать удар.
    effects: { clotYield: 0.9, plasmaYield: -0.15, regen: 6, defense: 2 },
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
    description: 'Больше действий за цикл и быстрее рост — ценой общей продуктивности.',
    /*
     * Замер показал ноль побед: три лишних действия не окупали минус пятую
     * часть всей добычи и вдобавок подталкивали расширяться быстрее, чем
     * цитадель способна удержать. Штраф смягчён, добавлены опыт и запас
     * прочности, а число действий снижено до двух.
     */
    effects: {
      maxEnergy: 2,
      plasmaYield: -0.08,
      clotYield: -0.08,
      essenceYield: -0.08,
      xpYield: 0.2,
      maxIntegrity: 18,
    },
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
