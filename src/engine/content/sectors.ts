import type { RegionId, SectorDef } from '../types'

export interface RegionDef {
  id: RegionId
  name: string
  subtitle: string
  description: string
  /** Сектор-нексус предыдущего региона, победа над которым открывает этот. */
  unlockedBy: string | null
}

export const REGIONS: RegionDef[] = [
  {
    id: 'capillary',
    name: 'Капиллярное поле',
    subtitle: 'Регион I',
    description:
      'Тонкие русла на окраине системы. Иммунитет сюда почти не заглядывает — здесь империя учится дышать.',
    unlockedBy: null,
  },
  {
    id: 'venous',
    name: 'Венозные пределы',
    subtitle: 'Регион II',
    description:
      'Медленные обратные течения и первые заставы. Тут появляется то, что умеет держать строй.',
    unlockedBy: 'cap-nexus',
  },
  {
    id: 'arterial',
    name: 'Артериальный предел',
    subtitle: 'Регион III',
    description:
      'Давление, кислород и патрули, которые не отступают. Каждый захват здесь оплачен целостностью.',
    unlockedBy: 'ven-nexus',
  },
  {
    id: 'cortex',
    name: 'Кортикальное ядро',
    subtitle: 'Регион IV',
    description:
      'За барьером — то, ради чего всё затевалось. Отсюда кровь впервые смотрит на разум, который её носит.',
    unlockedBy: 'art-nexus',
  },
]

/** Стартовый сектор: контролируется с первого цикла. */
export const START_SECTOR = 'cap-core'
/** Финальный сектор: его захват начинает осаду и открывает перегрузку ядра. */
export const THRONE_SECTOR = 'ctx-throne'

/**
 * Рёбра графа карты. Соседство выводится отсюда, а не пишется руками в каждом
 * секторе, — так граф не может стать несимметричным. Симметрия и связность
 * проверяются тестом tests/map.test.ts.
 */
export const SECTOR_EDGES: ReadonlyArray<readonly [string, string]> = [
  // Регион I — Капиллярное поле
  ['cap-core', 'cap-drift'],
  ['cap-core', 'cap-silt'],
  ['cap-drift', 'cap-weave'],
  ['cap-silt', 'cap-watch'],
  ['cap-weave', 'cap-cache'],
  ['cap-weave', 'cap-relay'],
  ['cap-watch', 'cap-relay'],
  ['cap-cache', 'cap-forge'],
  ['cap-relay', 'cap-forge'],
  ['cap-forge', 'cap-nexus'],
  ['cap-watch', 'cap-nexus'],

  // Переход I → II
  ['cap-nexus', 'ven-gate'],

  // Регион II — Венозные пределы
  ['ven-gate', 'ven-marsh'],
  ['ven-gate', 'ven-mill'],
  ['ven-marsh', 'ven-sanctum'],
  ['ven-mill', 'ven-hollow'],
  ['ven-sanctum', 'ven-relay'],
  ['ven-hollow', 'ven-guard'],
  ['ven-relay', 'ven-crypt'],
  ['ven-guard', 'ven-crypt'],
  ['ven-crypt', 'ven-forge'],
  ['ven-relay', 'ven-forge'],
  ['ven-forge', 'ven-nexus'],
  ['ven-guard', 'ven-nexus'],

  // Переход II → III
  ['ven-nexus', 'art-march'],

  // Регион III — Артериальный предел
  ['art-march', 'art-furnace'],
  ['art-march', 'art-ridge'],
  ['art-furnace', 'art-sanctum'],
  ['art-ridge', 'art-well'],
  ['art-sanctum', 'art-relay'],
  ['art-well', 'art-bastion'],
  ['art-relay', 'art-vault'],
  ['art-bastion', 'art-vault'],
  ['art-vault', 'art-spire'],
  ['art-relay', 'art-forge'],
  ['art-spire', 'art-forge'],
  ['art-forge', 'art-nexus'],
  ['art-bastion', 'art-nexus'],

  // Переход III → IV
  ['art-nexus', 'ctx-approach'],

  // Регион IV — Кортикальное ядро
  ['ctx-approach', 'ctx-lattice'],
  ['ctx-approach', 'ctx-well'],
  ['ctx-lattice', 'ctx-sanctum'],
  ['ctx-well', 'ctx-bastion'],
  ['ctx-sanctum', 'ctx-vault'],
  ['ctx-bastion', 'ctx-vault'],
  ['ctx-vault', 'ctx-forge'],
  ['ctx-lattice', 'ctx-forge'],
  ['ctx-forge', 'ctx-throne'],
  ['ctx-bastion', 'ctx-throne'],
] as const

export const SECTORS: SectorDef[] = [
  // ─── Регион I: Капиллярное поле ───────────────────────────────────────────
  {
    id: 'cap-core',
    name: 'Первичный сгусток',
    region: 'capillary',
    type: 'bastion',
    difficulty: 0,
    heat: 0,
    description: 'Точка, где кровь впервые собрала себя в мысль. Отсюда начинается всё.',
    income: { plasma: 2 },
  },
  {
    id: 'cap-drift',
    name: 'Капиллярный пролив',
    region: 'capillary',
    type: 'harvest',
    difficulty: 1,
    heat: 0.4,
    description: 'Медленное течение, богатое свободной плазмой. Идеальное первое приобретение.',
    income: { plasma: 5 },
    bounty: { plasma: 25, xp: 10 },
  },
  {
    id: 'cap-silt',
    name: 'Тромбоцитовая отмель',
    region: 'capillary',
    type: 'harvest',
    difficulty: 1,
    heat: 0.5,
    description: 'Осевшие пластинки, готовые к переработке.',
    income: { plasma: 4, clots: 1 },
    bounty: { plasma: 20, clots: 6, xp: 10 },
  },
  {
    id: 'cap-weave',
    name: 'Плетение фибрина',
    region: 'capillary',
    type: 'refinery',
    difficulty: 2,
    heat: 0.8,
    description: 'Естественная сеть, превращающая плазму в плотную структуру.',
    income: { clots: 3 },
    bounty: { clots: 10, xp: 16 },
    garrison: 'scout-phage',
  },
  {
    id: 'cap-watch',
    name: 'Дозор макрофагов',
    region: 'capillary',
    type: 'bastion',
    difficulty: 2,
    heat: 0.6,
    description: 'Заброшенный наблюдательный узел. Кто держит его — видит подход бури.',
    income: { defense: 2, integrity: 10 },
    bounty: { clots: 8, xp: 18 },
    garrison: 'scout-phage',
  },
  {
    id: 'cap-relay',
    name: 'Малый синус',
    region: 'capillary',
    type: 'relay',
    difficulty: 2,
    heat: 0.5,
    description: 'Расширение русла, где импульс разгоняется и достаёт дальше.',
    income: { energy: 1 },
    bounty: { plasma: 30, xp: 20 },
  },
  {
    id: 'cap-cache',
    name: 'Схрон плазмоцитов',
    region: 'capillary',
    type: 'vault',
    difficulty: 2,
    heat: 0.3,
    description: 'Запечатанный запас. Взять можно только что-то одно.',
    bounty: { xp: 15 },
    cache: [
      {
        id: 'cap-cache-plasma',
        label: 'Вскрыть плазменный резервуар',
        description: 'Мгновенный приток сырья для первых построек.',
        reward: { plasma: 90 },
      },
      {
        id: 'cap-cache-clots',
        label: 'Забрать спрессованные сгустки',
        description: 'Готовый материал для модулей и боевых всплесков.',
        reward: { clots: 34 },
      },
      {
        id: 'cap-cache-essence',
        label: 'Извлечь каплю эссенции',
        description: 'Редкий концентрат, открывающий путь к доктринам.',
        reward: { essence: 4, xp: 20 },
      },
    ],
  },
  {
    id: 'cap-forge',
    name: 'Кузница эритроцитов',
    region: 'capillary',
    type: 'forge',
    difficulty: 3,
    heat: 0.7,
    description: 'Древний конвейер, всё ещё способный отливать боевые контуры.',
    bounty: { clots: 14, xp: 28 },
    garrison: 'clot-eater',
    grantsModule: 'forge-core',
  },
  {
    id: 'cap-nexus',
    name: 'Ворота венул',
    region: 'capillary',
    type: 'nexus',
    difficulty: 4,
    heat: 1,
    description: 'Створ, за которым русло становится широким. Его стерегут всерьёз.',
    bounty: { plasma: 60, clots: 20, essence: 3, xp: 60 },
    garrison: 'gate-warden',
  },

  // ─── Регион II: Венозные пределы ──────────────────────────────────────────
  {
    id: 'ven-gate',
    name: 'Венозный порог',
    region: 'venous',
    type: 'harvest',
    difficulty: 4,
    heat: 0.8,
    description: 'Первая широкая вена. Течение здесь щедрее, но и заметнее.',
    income: { plasma: 8 },
    bounty: { plasma: 40, xp: 26 },
  },
  {
    id: 'ven-marsh',
    name: 'Венозная марь',
    region: 'venous',
    type: 'harvest',
    difficulty: 4,
    heat: 1,
    description: 'Застойные карманы, где плазма копится годами.',
    income: { plasma: 10 },
    bounty: { plasma: 55, xp: 28 },
    garrison: 'drift-hunter',
  },
  {
    id: 'ven-mill',
    name: 'Дробильня тромбов',
    region: 'venous',
    type: 'refinery',
    difficulty: 5,
    heat: 1.1,
    description: 'Турбулентный узел, перемалывающий всё, что в него попадает.',
    income: { clots: 6 },
    bounty: { clots: 24, xp: 32 },
    garrison: 'drift-hunter',
  },
  {
    id: 'ven-sanctum',
    name: 'Санктум лимфы',
    region: 'venous',
    type: 'sanctum',
    difficulty: 5,
    heat: 0.2,
    description: 'Тихая заводь вне иммунных маршрутов. Здесь империю почти не слышно.',
    income: { essence: 1, suppression: 0.1 },
    bounty: { essence: 4, xp: 34 },
  },
  {
    id: 'ven-hollow',
    name: 'Полость селезёнки',
    region: 'venous',
    type: 'vault',
    difficulty: 5,
    heat: 0.6,
    description: 'Склад изъятого. Система хранила это для себя.',
    bounty: { xp: 30 },
    garrison: 'splenic-keeper',
    cache: [
      {
        id: 'ven-hollow-mass',
        label: 'Разграбить хранилища',
        description: 'Крупная разовая добыча всех трёх видов сырья.',
        reward: { plasma: 160, clots: 60, essence: 6 },
      },
      {
        id: 'ven-hollow-core',
        label: 'Поглотить ядро склада',
        description: 'Необратимо укрепляет цитадель.',
        reward: { integrity: 30, xp: 60 },
      },
      {
        id: 'ven-hollow-conduit',
        label: 'Перепрошить магистраль',
        description: 'Постоянно расширяет запас энергии цитадели.',
        reward: { maxEnergy: 1, essence: 8 },
      },
    ],
  },
  {
    id: 'ven-guard',
    name: 'Застава лейкоцитов',
    region: 'venous',
    type: 'bastion',
    difficulty: 6,
    heat: 0.9,
    description: 'Укреплённый узел иммунной логистики. Отличная крепость — если её отнять.',
    income: { defense: 4, integrity: 20 },
    bounty: { clots: 28, xp: 40 },
    garrison: 'lymph-lancer',
  },
  {
    id: 'ven-relay',
    name: 'Клапанный узел',
    region: 'venous',
    type: 'relay',
    difficulty: 5,
    heat: 0.7,
    description: 'Управляет направлением потока. Кто владеет им — быстрее реагирует.',
    income: { energy: 1, plasma: 3 },
    bounty: { plasma: 45, xp: 36 },
  },
  {
    id: 'ven-crypt',
    name: 'Крипта плазмобластов',
    region: 'venous',
    type: 'harvest',
    difficulty: 6,
    heat: 1.2,
    description: 'Кладка незрелых клеток. Богато и мерзко.',
    income: { plasma: 9, essence: 1 },
    bounty: { plasma: 60, essence: 3, xp: 44 },
    garrison: 'blast-swarm',
  },
  {
    id: 'ven-forge',
    name: 'Синтез-камера',
    region: 'venous',
    type: 'forge',
    difficulty: 7,
    heat: 1,
    description: 'Здесь система собирала свои антитела. Теперь соберёт кое-что для вас.',
    bounty: { essence: 6, xp: 52 },
    garrison: 'lymph-lancer',
    grantsModule: 'rally-node',
  },
  {
    id: 'ven-nexus',
    name: 'Врата аорты',
    region: 'venous',
    type: 'nexus',
    difficulty: 8,
    heat: 1.4,
    description: 'Створ высокого давления. За ним начинается настоящая война.',
    bounty: { plasma: 120, clots: 45, essence: 8, xp: 110 },
    garrison: 'aortic-sentinel',
  },

  // ─── Регион III: Артериальный предел ──────────────────────────────────────
  {
    id: 'art-march',
    name: 'Артериальный марш',
    region: 'arterial',
    type: 'harvest',
    difficulty: 8,
    heat: 1.3,
    description: 'Стремительное русло. Здесь плазма приходит потоком, а патрули — волнами.',
    income: { plasma: 14 },
    bounty: { plasma: 80, xp: 56 },
  },
  {
    id: 'art-furnace',
    name: 'Горнило кислорода',
    region: 'arterial',
    type: 'refinery',
    difficulty: 9,
    heat: 1.5,
    description: 'Насыщенная зона, где переработка идёт втрое быстрее.',
    income: { clots: 11 },
    bounty: { clots: 40, xp: 62 },
    garrison: 'oxy-reaver',
  },
  {
    id: 'art-ridge',
    name: 'Гребень иммунитета',
    region: 'arterial',
    type: 'harvest',
    difficulty: 9,
    heat: 1.6,
    description: 'Пограничный вал. Взять его — значит объявить себя вслух.',
    income: { plasma: 12, clots: 3 },
    bounty: { plasma: 70, clots: 25, xp: 64 },
    garrison: 'ridge-phalanx',
  },
  {
    id: 'art-sanctum',
    name: 'Санктум ферритина',
    region: 'arterial',
    type: 'sanctum',
    difficulty: 9,
    heat: 0.2,
    description: 'Железная тишина. Даже иммунные маркеры здесь теряются.',
    income: { essence: 2, suppression: 0.14 },
    bounty: { essence: 8, xp: 66 },
    garrison: 'ferro-ascetic',
  },
  {
    id: 'art-well',
    name: 'Кислородный колодец',
    region: 'arterial',
    type: 'refinery',
    difficulty: 10,
    heat: 1.4,
    description: 'Вертикальный канал невероятной плотности.',
    income: { clots: 9, plasma: 4 },
    bounty: { clots: 44, xp: 70 },
    garrison: 'oxy-reaver',
  },
  {
    id: 'art-bastion',
    name: 'Бастион эндотелия',
    region: 'arterial',
    type: 'bastion',
    difficulty: 10,
    heat: 1.2,
    description: 'Стена из живой выстилки. Держит удар лучше любого модуля.',
    income: { defense: 7, integrity: 35 },
    bounty: { clots: 50, xp: 76 },
    garrison: 'ridge-phalanx',
  },
  {
    id: 'art-relay',
    name: 'Аортальный ретранслятор',
    region: 'arterial',
    type: 'relay',
    difficulty: 9,
    heat: 1,
    description: 'Узел, слышимый по всей системе. Через него империя говорит.',
    income: { energy: 1, plasma: 6 },
    bounty: { plasma: 90, xp: 68 },
  },
  {
    id: 'art-vault',
    name: 'Хранилище ферритина',
    region: 'arterial',
    type: 'vault',
    difficulty: 10,
    heat: 0.7,
    description: 'Стратегический резерв системы. Один выбор — одна судьба.',
    bounty: { xp: 70 },
    garrison: 'vault-custodian',
    cache: [
      {
        id: 'art-vault-hoard',
        label: 'Вынести весь резерв',
        description: 'Колоссальная разовая добыча.',
        reward: { plasma: 320, clots: 140, essence: 16 },
      },
      {
        id: 'art-vault-plate',
        label: 'Вплавить железо в ядро',
        description: 'Мощное необратимое усиление целостности.',
        reward: { integrity: 60, xp: 120 },
      },
      {
        id: 'art-vault-engine',
        label: 'Запустить резервный двигатель',
        description: 'Постоянно расширяет запас энергии и даёт эссенцию.',
        reward: { maxEnergy: 2, essence: 14 },
      },
    ],
  },
  {
    id: 'art-spire',
    name: 'Шпиль интерферона',
    region: 'arterial',
    type: 'sanctum',
    difficulty: 11,
    heat: 0.3,
    description: 'Передатчик тревоги. Замолчав, он оглушает всю иммунную сеть.',
    income: { essence: 3, suppression: 0.18 },
    bounty: { essence: 12, xp: 84 },
    garrison: 'interferon-choir',
  },
  {
    id: 'art-forge',
    name: 'Синтез-купол архонтов',
    region: 'arterial',
    type: 'forge',
    difficulty: 11,
    heat: 1.1,
    description: 'Купол, где система проектировала своих лучших охотников.',
    bounty: { essence: 14, xp: 92 },
    garrison: 'archon-prototype',
    grantsModule: 'crimson-forge',
  },
  {
    id: 'art-nexus',
    name: 'Барьер гемато-энцефалии',
    region: 'arterial',
    type: 'nexus',
    difficulty: 12,
    heat: 1.8,
    description: 'Последняя стена между кровью и разумом. Она не должна была пасть.',
    bounty: { plasma: 260, clots: 110, essence: 22, xp: 220 },
    garrison: 'barrier-archon',
  },

  // ─── Регион IV: Кортикальное ядро ─────────────────────────────────────────
  {
    id: 'ctx-approach',
    name: 'Подступы к коре',
    region: 'cortex',
    type: 'harvest',
    difficulty: 12,
    heat: 1.6,
    description: 'Тонкая сеть, питающая мысль. Плазма здесь почти светится.',
    income: { plasma: 20, essence: 1 },
    bounty: { plasma: 140, essence: 6, xp: 120 },
    garrison: 'myelin-stalker',
  },
  {
    id: 'ctx-lattice',
    name: 'Нейро-решётка',
    region: 'cortex',
    type: 'relay',
    difficulty: 13,
    heat: 1.4,
    description: 'Сеть, в которой сигнал обгоняет кровь. Империя учится думать быстрее себя.',
    income: { energy: 2, plasma: 8 },
    bounty: { plasma: 160, xp: 130 },
    garrison: 'synaptic-echo',
  },
  {
    id: 'ctx-well',
    name: 'Синаптический колодец',
    region: 'cortex',
    type: 'refinery',
    difficulty: 13,
    heat: 1.7,
    description: 'Каскад разрядов, спекающий сгустки в нечто новое.',
    income: { clots: 18, essence: 1 },
    bounty: { clots: 90, essence: 8, xp: 132 },
    garrison: 'synaptic-echo',
  },
  {
    id: 'ctx-sanctum',
    name: 'Санктум миелина',
    region: 'cortex',
    type: 'sanctum',
    difficulty: 13,
    heat: 0.2,
    description: 'Изолирующая оболочка глушит всё. Лучшее укрытие в системе.',
    income: { essence: 5, suppression: 0.22 },
    bounty: { essence: 20, xp: 140 },
    garrison: 'myelin-stalker',
  },
  {
    id: 'ctx-bastion',
    name: 'Кортикальный бастион',
    region: 'cortex',
    type: 'bastion',
    difficulty: 14,
    heat: 1.5,
    description: 'Последний рубеж обороны разума, обращённый теперь наружу.',
    income: { defense: 12, integrity: 60 },
    bounty: { clots: 110, xp: 150 },
    garrison: 'cortex-praetor',
  },
  {
    id: 'ctx-vault',
    name: 'Крипта архонта',
    region: 'cortex',
    type: 'vault',
    difficulty: 14,
    heat: 0.8,
    description: 'То, что система прятала даже от себя.',
    bounty: { xp: 150 },
    garrison: 'vault-custodian',
    cache: [
      {
        id: 'ctx-vault-hoard',
        label: 'Опустошить крипту',
        description: 'Ресурсы на весь оставшийся поход.',
        reward: { plasma: 600, clots: 280, essence: 40 },
      },
      {
        id: 'ctx-vault-heart',
        label: 'Впитать сердце архонта',
        description: 'Предельное усиление ядра.',
        reward: { integrity: 120, xp: 260 },
      },
      {
        id: 'ctx-vault-mind',
        label: 'Присвоить чужой разум',
        description: 'Энергия и эссенция сверх всяких норм.',
        reward: { maxEnergy: 3, essence: 32 },
      },
    ],
  },
  {
    id: 'ctx-forge',
    name: 'Горн сингулярности',
    region: 'cortex',
    type: 'forge',
    difficulty: 15,
    heat: 1.3,
    description: 'Незавершённый проект системы. Империя его достроит.',
    bounty: { essence: 30, xp: 190 },
    garrison: 'archon-prototype',
    grantsModule: 'singularity-heart',
  },
  {
    id: 'ctx-throne',
    name: 'Тронный синус',
    region: 'cortex',
    type: 'nexus',
    difficulty: 17,
    heat: 2,
    description:
      'Полость, где сходятся все течения. Здесь кровь встретит то, что всё это время ею управляло.',
    bounty: { plasma: 900, clots: 400, essence: 60, xp: 500 },
    garrison: 'sovereign-immunis',
  },
]

export const SECTOR_BY_ID: ReadonlyMap<string, SectorDef> = new Map(SECTORS.map(s => [s.id, s]))

/** Список соседей для каждого сектора, выведенный из SECTOR_EDGES. */
export const SECTOR_NEIGHBORS: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, string[]>()
  for (const sector of SECTORS) map.set(sector.id, [])
  for (const [a, b] of SECTOR_EDGES) {
    map.get(a)?.push(b)
    map.get(b)?.push(a)
  }
  return map
})()

export function getSector(id: string): SectorDef | undefined {
  return SECTOR_BY_ID.get(id)
}

export function neighborsOf(id: string): readonly string[] {
  return SECTOR_NEIGHBORS.get(id) ?? []
}
