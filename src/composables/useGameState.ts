import { computed, reactive, ref, watch } from 'vue'

export type NodeType =
  | 'harvest'
  | 'battle'
  | 'ruins'
  | 'forge'
  | 'boss'
  | 'sanctuary'
  | 'relay'
  | 'vault'

export interface GameNode {
  id: string
  name: string
  type: NodeType
  difficulty: number
  discovered: boolean
  cleared: boolean
  reward?: {
    clots?: number
    plasma?: number
    essence?: number
    moduleId?: string
    experience?: number
  }
}

export interface GameModule {
  id: string
  name: string
  description: string
  category: string
  tier: number
  branch: string
  cost: {
    clots?: number
    plasma?: number
    essence?: number
  }
  upgradeCosts: Array<GameModule['cost']>
  effects: {
    attack?: number
    defense?: number
    plasmaRate?: number
    masking?: number
    energy?: number
    integrity?: number
  }
  requires?: string[]
  unlocked: boolean
  level: number
  maxLevel: number
}

export interface Doctrine {
  id: string
  name: string
  description: string
  focus: string
  branch: string
  tier: number
  cost: GameModule['cost']
  upgradeCosts: Array<GameModule['cost']>
  effects: GameModule['effects']
  requires?: string[]
  unlocked: boolean
  level: number
  maxLevel: number
}

export interface ResourceUpgrade {
  id: string
  name: string
  description: string
  branch: string
  tier: number
  cost: GameModule['cost']
  upgradeCosts: Array<GameModule['cost']>
  effects: {
    plasmaYield?: number
    clotYield?: number
    essenceYield?: number
    plasmaCostReduction?: number
    clotCostReduction?: number
    essenceCostReduction?: number
    threatShift?: number
    experienceBonus?: number
  }
  requires?: string[]
  unlocked: boolean
  level: number
  maxLevel: number
}

interface EnemyIntent {
  id: 'strike' | 'heavy' | 'pierce' | 'drain'
  label: string
  multiplier: number
  threat: number
  pierce?: boolean
  drain?: number
}

interface Encounter {
  nodeId: string
  enemyName: string
  hp: number
  maxHp: number
  attack: number
  intent: EnemyIntent
  reward?: GameNode['reward']
}

interface CombatState {
  guarded: boolean
  focused: boolean
}

interface Notification {
  id: number
  message: string
  type: 'info' | 'warning' | 'success'
}

interface HarvestMode {
  id: string
  name: string
  description: string
  plasmaMultiplier: number
  threatDelta: number
  maskingDelta: number
  energyCost: number
}

interface Achievement {
  id: string
  title: string
  description: string
  unlocked: boolean
  progress?: number
  target?: number
}

export interface TutorialStep {
  id: string
  title: string
  text: string
}

const STORAGE_KEY = 'clots_game_state_v5'

const levelThresholds = [0, 60, 150, 280, 450, 650, 900, 1200, 1600]

const tutorialSteps: TutorialStep[] = [
  {
    id: 'step-1',
    title: 'Соберите плазму',
    text: 'Начните с «Сбора плазмы», чтобы запустить экономику.'
  },
  {
    id: 'step-2',
    title: 'Синтезируйте сгустки',
    text: 'Преобразуйте плазму в сгустки и откройте путь к модулям.'
  },
  {
    id: 'step-3',
    title: 'Интегрируйте первый модуль',
    text: 'Перейдите в «Развитие» и установите модуль в ветке экономики.'
  },
  {
    id: 'step-4',
    title: 'Стабилизируйте сектор',
    text: 'На карте выберите сектор и проведите исследование.'
  },
  {
    id: 'step-5',
    title: 'Примите доктрину',
    text: 'Выберите путь развития в дереве доктрин и активируйте его.'
  },
  {
    id: 'step-6',
    title: 'Выдержите бой',
    text: 'Найдите боевой сектор, победите угрозу и закрепите контроль.'
  }
]

const baseNodes: GameNode[] = [
  {
    id: 'n1',
    name: 'Капиллярный пролив',
    type: 'harvest',
    difficulty: 1,
    discovered: true,
    cleared: false,
    reward: { plasma: 25, experience: 12 }
  },
  {
    id: 'n2',
    name: 'Узел тромбоцитов',
    type: 'battle',
    difficulty: 2,
    discovered: false,
    cleared: false,
    reward: { clots: 10, essence: 2, experience: 26 }
  },
  {
    id: 'n3',
    name: 'Костномозговой рифт',
    type: 'ruins',
    difficulty: 3,
    discovered: false,
    cleared: false,
    reward: { essence: 6, experience: 32 }
  },
  {
    id: 'n4',
    name: 'Кузница эритроцитов',
    type: 'forge',
    difficulty: 3,
    discovered: false,
    cleared: false,
    reward: { moduleId: 'forge-core', experience: 40 }
  },
  {
    id: 'n5',
    name: 'Шторм иммунного патруля',
    type: 'battle',
    difficulty: 4,
    discovered: false,
    cleared: false,
    reward: { clots: 18, essence: 4, experience: 46 }
  },
  {
    id: 'n6',
    name: 'Нейро-синус',
    type: 'relay',
    difficulty: 4,
    discovered: false,
    cleared: false,
    reward: { plasma: 45, essence: 3, experience: 50 }
  },
  {
    id: 'n7',
    name: 'Базальная низина',
    type: 'harvest',
    difficulty: 5,
    discovered: false,
    cleared: false,
    reward: { plasma: 60, clots: 12, experience: 54 }
  },
  {
    id: 'n8',
    name: 'Сангвинарные руины',
    type: 'ruins',
    difficulty: 5,
    discovered: false,
    cleared: false,
    reward: { essence: 10, experience: 60 }
  },
  {
    id: 'n9',
    name: 'Ворота лимфы',
    type: 'battle',
    difficulty: 6,
    discovered: false,
    cleared: false,
    reward: { clots: 28, essence: 6, experience: 70 }
  },
  {
    id: 'n10',
    name: 'Санктум плазмолинии',
    type: 'sanctuary',
    difficulty: 6,
    discovered: false,
    cleared: false,
    reward: { plasma: 90, essence: 5, experience: 76 }
  },
  {
    id: 'n11',
    name: 'Синаптический пролом',
    type: 'forge',
    difficulty: 7,
    discovered: false,
    cleared: false,
    reward: { moduleId: 'rally-node', experience: 84 }
  },
  {
    id: 'n12',
    name: 'Атриум коры',
    type: 'boss',
    difficulty: 8,
    discovered: false,
    cleared: false,
    reward: { clots: 60, essence: 16, experience: 120 }
  },
  {
    id: 'n13',
    name: 'Хранилище ферритина',
    type: 'vault',
    difficulty: 8,
    discovered: false,
    cleared: false,
    reward: { clots: 80, plasma: 70, experience: 130 }
  },
  {
    id: 'n14',
    name: 'Эритроцитарный маяк',
    type: 'relay',
    difficulty: 9,
    discovered: false,
    cleared: false,
    reward: { plasma: 110, essence: 14, experience: 150 }
  },
  {
    id: 'n15',
    name: 'Крипта лейкоцитов',
    type: 'ruins',
    difficulty: 9,
    discovered: false,
    cleared: false,
    reward: { essence: 20, experience: 160 }
  },
  {
    id: 'n16',
    name: 'Полярный гребень иммунитета',
    type: 'battle',
    difficulty: 10,
    discovered: false,
    cleared: false,
    reward: { clots: 90, essence: 18, experience: 180 }
  },
  {
    id: 'n17',
    name: 'Синтез-купол архонтов',
    type: 'forge',
    difficulty: 10,
    discovered: false,
    cleared: false,
    reward: { moduleId: 'crimson-forge', experience: 200 }
  },
  {
    id: 'n18',
    name: 'Тронный синус',
    type: 'boss',
    difficulty: 11,
    discovered: false,
    cleared: false,
    reward: { clots: 140, essence: 30, experience: 260 }
  }
]

const baseModules: GameModule[] = [
  {
    id: 'pulse-harvester',
    name: 'Пульс-сборщик',
    description: 'Пассивно увеличивает добычу плазмы каждую секунду.',
    category: 'Экономика',
    branch: 'Плазменный поток',
    tier: 1,
    cost: { clots: 12, plasma: 40 },
    upgradeCosts: [{ clots: 18, plasma: 60 }, { clots: 24, plasma: 90 }],
    effects: { plasmaRate: 1.4 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'veil-shroud',
    name: 'Пелена маскировки',
    description: 'Снижает рост угрозы и повышает скрытность.',
    category: 'Скрытность',
    branch: 'Тени',
    tier: 1,
    cost: { essence: 4, plasma: 25 },
    upgradeCosts: [{ essence: 6, plasma: 45 }, { essence: 8, plasma: 70 }],
    effects: { masking: 8, defense: 1 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'hem-arsenal',
    name: 'Гемо-арсенал',
    description: 'Усиливает боевые импульсы и урон по врагу.',
    category: 'Штурм',
    branch: 'Штурмовой контур',
    tier: 1,
    cost: { clots: 20, essence: 6 },
    upgradeCosts: [{ clots: 28, essence: 8 }, { clots: 38, essence: 12 }],
    effects: { attack: 3 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'energy-loop',
    name: 'Контур питания',
    description: 'Увеличивает запас энергии и ускоряет восстановление.',
    category: 'Энергия',
    branch: 'Энергетический купол',
    tier: 1,
    cost: { plasma: 60, essence: 3 },
    upgradeCosts: [{ plasma: 90, essence: 6 }, { plasma: 130, essence: 10 }],
    effects: { energy: 2 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'forge-core',
    name: 'Ядро кузницы',
    description: 'Открывает продвинутые синтезы и улучшает защиту.',
    category: 'Оборона',
    branch: 'Цитадель',
    tier: 2,
    cost: { clots: 30, essence: 10 },
    upgradeCosts: [{ clots: 40, essence: 14 }, { clots: 60, essence: 20 }],
    effects: { defense: 2, plasmaRate: 0.8 },
    requires: ['pulse-harvester'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'rally-node',
    name: 'Узел концентрации',
    description: 'Поднимает максимальную целостность цитадели.',
    category: 'Оборона',
    branch: 'Цитадель',
    tier: 2,
    cost: { clots: 28, essence: 8 },
    upgradeCosts: [{ clots: 38, essence: 12 }, { clots: 52, essence: 16 }],
    effects: { integrity: 8 },
    requires: ['forge-core'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'blood-matrix',
    name: 'Матрица сгустков',
    description: 'Укрепляет боевой темп и уменьшает расход сгустков.',
    category: 'Штурм',
    branch: 'Штурмовой контур',
    tier: 2,
    cost: { clots: 40, plasma: 55 },
    upgradeCosts: [{ clots: 54, plasma: 80 }, { clots: 75, plasma: 110 }],
    effects: { attack: 2, defense: 1 },
    requires: ['hem-arsenal'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'silent-veil',
    name: 'Тихий покров',
    description: 'Глушит рост угрозы и усиливает маскировку.',
    category: 'Скрытность',
    branch: 'Тени',
    tier: 2,
    cost: { plasma: 80, essence: 10 },
    upgradeCosts: [{ plasma: 110, essence: 16 }, { plasma: 150, essence: 22 }],
    effects: { masking: 12 },
    requires: ['veil-shroud'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'sanguine-pylon',
    name: 'Сангвинарный пилон',
    description: 'Конденсирует плазму и поднимает общий темп добычи.',
    category: 'Экономика',
    branch: 'Плазменный поток',
    tier: 2,
    cost: { plasma: 120, clots: 35 },
    upgradeCosts: [{ plasma: 160, clots: 48 }, { plasma: 210, clots: 60 }],
    effects: { plasmaRate: 2.2 },
    requires: ['pulse-harvester'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'phase-screen',
    name: 'Фазовый экран',
    description: 'Укрепляет защиту и сглаживает всплески угрозы.',
    category: 'Оборона',
    branch: 'Цитадель',
    tier: 3,
    cost: { essence: 14, clots: 45 },
    upgradeCosts: [{ essence: 20, clots: 60 }, { essence: 28, clots: 85 }],
    effects: { defense: 3, masking: 6, integrity: 6 },
    requires: ['rally-node'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'nerve-lattice',
    name: 'Нервная решётка',
    description: 'Сокращает издержки действий, усиливая энергоотдачу.',
    category: 'Энергия',
    branch: 'Энергетический купол',
    tier: 3,
    cost: { plasma: 140, essence: 12 },
    upgradeCosts: [{ plasma: 190, essence: 18 }, { plasma: 240, essence: 26 }],
    effects: { energy: 3, plasmaRate: 0.6 },
    requires: ['energy-loop'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'scarlet-arsenal',
    name: 'Алый арсенал',
    description: 'Закрепляет атакующий контур и повышает стойкость.',
    category: 'Штурм',
    branch: 'Штурмовой контур',
    tier: 3,
    cost: { clots: 70, essence: 18 },
    upgradeCosts: [{ clots: 96, essence: 26 }, { clots: 130, essence: 36 }],
    effects: { attack: 4, defense: 2 },
    requires: ['blood-matrix'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'crimson-forge',
    name: 'Багровая кузня',
    description: 'Позволяет ковать элитные импульсы и укреплять ядро.',
    category: 'Экономика',
    branch: 'Плазменный поток',
    tier: 4,
    cost: { plasma: 180, essence: 20, clots: 90 },
    upgradeCosts: [
      { plasma: 240, essence: 28, clots: 120 },
      { plasma: 320, essence: 40, clots: 160 }
    ],
    effects: { attack: 3, plasmaRate: 2.4, integrity: 10 },
    requires: ['sanguine-pylon'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  }
]

const baseDoctrines: Doctrine[] = [
  {
    id: 'reaver',
    name: 'Доктрина Пожирателей',
    description: 'Ставка на агрессию и давление, растущий урон и плазму.',
    focus: 'Атака',
    branch: 'Агрессия',
    tier: 1,
    cost: { essence: 6, plasma: 40 },
    upgradeCosts: [{ essence: 10, plasma: 65 }, { essence: 15, plasma: 95 }],
    effects: { attack: 2, plasmaRate: 0.8 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'warden',
    name: 'Доктрина Стражей',
    description: 'Выживаемость и контроль: защита, маскировка, целостность.',
    focus: 'Оборона',
    branch: 'Фортификация',
    tier: 1,
    cost: { essence: 6, clots: 20 },
    upgradeCosts: [{ essence: 10, clots: 35 }, { essence: 16, clots: 50 }],
    effects: { defense: 2, masking: 6, integrity: 6 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'weaver',
    name: 'Доктрина Ткачей',
    description: 'Энергия и темп, ускоряющий экономику и восстановление.',
    focus: 'Экономика',
    branch: 'Поток',
    tier: 1,
    cost: { essence: 5, plasma: 30 },
    upgradeCosts: [{ essence: 8, plasma: 50 }, { essence: 12, plasma: 75 }],
    effects: { energy: 1, plasmaRate: 1.1 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'vanguard',
    name: 'Доктрина Авангарда',
    description: 'Манёвры на грани: урон, маскировка и жёсткая экономия.',
    focus: 'Гибрид',
    branch: 'Агрессия',
    tier: 2,
    cost: { essence: 10, clots: 40 },
    upgradeCosts: [{ essence: 16, clots: 60 }, { essence: 22, clots: 85 }],
    effects: { attack: 2, masking: 5, plasmaRate: 0.6 },
    requires: ['reaver'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'oracle',
    name: 'Доктрина Провидцев',
    description: 'Чувствительность к угрозам и усиление энергопотоков.',
    focus: 'Контроль',
    branch: 'Фортификация',
    tier: 2,
    cost: { essence: 12, plasma: 65 },
    upgradeCosts: [{ essence: 18, plasma: 95 }, { essence: 26, plasma: 130 }],
    effects: { energy: 2, defense: 1, masking: 4 },
    requires: ['warden'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'pulsar',
    name: 'Доктрина Пульсаров',
    description: 'Экспоненциальный рост силы при длительной игре.',
    focus: 'Рост',
    branch: 'Поток',
    tier: 3,
    cost: { essence: 16, plasma: 90, clots: 60 },
    upgradeCosts: [
      { essence: 22, plasma: 130, clots: 85 },
      { essence: 30, plasma: 180, clots: 120 }
    ],
    effects: { attack: 3, plasmaRate: 1.5, integrity: 4 },
    requires: ['weaver'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  }
]

const baseResourceUpgrades: ResourceUpgrade[] = [
  {
    id: 'flux-cores',
    name: 'Флюкс-ядра',
    description: 'Базовое усиление плазменных потоков.',
    branch: 'Плазма',
    tier: 1,
    cost: { plasma: 45, clots: 8 },
    upgradeCosts: [{ plasma: 70, clots: 12 }, { plasma: 110, clots: 16 }],
    effects: { plasmaYield: 0.08 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'granulation',
    name: 'Грануляция',
    description: 'Повышает выход сгустков при переработке.',
    branch: 'Сгустки',
    tier: 1,
    cost: { plasma: 35, clots: 12 },
    upgradeCosts: [{ plasma: 55, clots: 18 }, { plasma: 80, clots: 26 }],
    effects: { clotYield: 0.12 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'essence-distill',
    name: 'Эссенциальный дистиллятор',
    description: 'Стабилизирует возгонку и повышает выход эссенции.',
    branch: 'Эссенция',
    tier: 1,
    cost: { clots: 24, essence: 4 },
    upgradeCosts: [{ clots: 32, essence: 6 }, { clots: 42, essence: 9 }],
    effects: { essenceYield: 0.1 },
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'plasma-lattice',
    name: 'Плазменная решётка',
    description: 'Снижает потребление плазмы при синтезе.',
    branch: 'Плазма',
    tier: 2,
    cost: { plasma: 90, clots: 20 },
    upgradeCosts: [{ plasma: 130, clots: 30 }, { plasma: 170, clots: 40 }],
    effects: { plasmaCostReduction: 0.08 },
    requires: ['flux-cores'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'clot-cascade',
    name: 'Каскад сгустков',
    description: 'Понижает расход сгустков в алхимических процессах.',
    branch: 'Сгустки',
    tier: 2,
    cost: { clots: 38, essence: 8 },
    upgradeCosts: [{ clots: 50, essence: 12 }, { clots: 65, essence: 18 }],
    effects: { clotCostReduction: 0.1 },
    requires: ['granulation'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'ether-siphon',
    name: 'Эфирный сифон',
    description: 'Снижает напряжение от добычи, уменьшает угрозу.',
    branch: 'Эссенция',
    tier: 2,
    cost: { essence: 8, plasma: 60 },
    upgradeCosts: [{ essence: 12, plasma: 90 }, { essence: 18, plasma: 130 }],
    effects: { threatShift: -0.6 },
    requires: ['essence-distill'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  },
  {
    id: 'harmonic-forge',
    name: 'Гармонический горн',
    description: 'Увеличивает опыт за добычу, раскрывая потенциал.',
    branch: 'Эссенция',
    tier: 3,
    cost: { essence: 16, plasma: 120 },
    upgradeCosts: [{ essence: 22, plasma: 160 }, { essence: 30, plasma: 210 }],
    effects: { experienceBonus: 0.2 },
    requires: ['ether-siphon'],
    unlocked: false,
    level: 0,
    maxLevel: 3
  }
]

const baseHarvestModes: HarvestMode[] = [
  {
    id: 'balanced',
    name: 'Сбалансированный поток',
    description: 'Надёжный приток плазмы без лишнего риска.',
    plasmaMultiplier: 1,
    threatDelta: 0,
    maskingDelta: 0,
    energyCost: 1
  },
  {
    id: 'rapid',
    name: 'Импульсный сифон',
    description: 'Быстрый сбор плазмы ценой роста угрозы.',
    plasmaMultiplier: 1.35,
    threatDelta: 3,
    maskingDelta: -2,
    energyCost: 1
  },
  {
    id: 'covert',
    name: 'Тихая капля',
    description: 'Медленнее, но снижает угрозу и укрепляет маскировку.',
    plasmaMultiplier: 0.85,
    threatDelta: -2,
    maskingDelta: 3,
    energyCost: 1
  },
  {
    id: 'resonance',
    name: 'Резонансный сбор',
    description: 'Максимальная прибыль, но требует больше энергии.',
    plasmaMultiplier: 1.6,
    threatDelta: 4,
    maskingDelta: -3,
    energyCost: 2
  }
]

const baseAchievements: Achievement[] = [
  {
    id: 'first-harvest',
    title: 'Первый прилив',
    description: 'Собрать плазму впервые.',
    unlocked: false
  },
  {
    id: 'first-module',
    title: 'Архитектор ядра',
    description: 'Интегрировать первый модуль.',
    unlocked: false
  },
  {
    id: 'first-doctrine',
    title: 'Выбор пути',
    description: 'Принять первую доктрину.',
    unlocked: false
  },
  {
    id: 'sector-clear',
    title: 'Стабилизация',
    description: 'Очистить первый сектор.',
    unlocked: false
  },
  {
    id: 'battle-win',
    title: 'Иммунный слом',
    description: 'Победить в первой схватке.',
    unlocked: false
  },
  {
    id: 'plasma-collector',
    title: 'Хранитель плазмы',
    description: 'Накопить 200 единиц плазмы.',
    unlocked: false,
    progress: 0,
    target: 200
  },
  {
    id: 'clot-master',
    title: 'Повелитель сгустков',
    description: 'Накопить 120 единиц сгустков.',
    unlocked: false,
    progress: 0,
    target: 120
  },
  {
    id: 'essence-weaver',
    title: 'Ткач эссенции',
    description: 'Накопить 30 единиц эссенции.',
    unlocked: false,
    progress: 0,
    target: 30
  },
  {
    id: 'level-five',
    title: 'Сила крови',
    description: 'Достичь 5 уровня цитадели.',
    unlocked: false
  },
  {
    id: 'tutorial-complete',
    title: 'Полный инструктаж',
    description: 'Завершить обучение.',
    unlocked: false
  }
]

const cloneCosts = (costs: Array<GameModule['cost']>) =>
  costs.map(cost => ({ ...cost }))

const cloneModules = () =>
  baseModules.map(module => ({
    ...module,
    cost: { ...module.cost },
    upgradeCosts: cloneCosts(module.upgradeCosts),
    effects: { ...module.effects },
    requires: module.requires ? [...module.requires] : undefined
  }))

const cloneDoctrines = () =>
  baseDoctrines.map(doctrine => ({
    ...doctrine,
    cost: { ...doctrine.cost },
    upgradeCosts: cloneCosts(doctrine.upgradeCosts),
    effects: { ...doctrine.effects },
    requires: doctrine.requires ? [...doctrine.requires] : undefined
  }))

const cloneResourceUpgrades = () =>
  baseResourceUpgrades.map(upgrade => ({
    ...upgrade,
    cost: { ...upgrade.cost },
    upgradeCosts: cloneCosts(upgrade.upgradeCosts),
    effects: { ...upgrade.effects },
    requires: upgrade.requires ? [...upgrade.requires] : undefined
  }))

const cloneAchievements = () =>
  baseAchievements.map(achievement => ({ ...achievement }))

const loadState = () => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const saveState = (payload: Record<string, unknown>) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

const encodeSave = (payload: Record<string, unknown>) => {
  const json = JSON.stringify(payload)
  const encoded = encodeURIComponent(json)
  return btoa(encoded)
}

const decodeSave = (code: string) => {
  const decoded = atob(code.trim())
  const json = decodeURIComponent(decoded)
  return JSON.parse(json)
}

const mergeAchievements = (saved: Achievement[] | undefined) => {
  if (!saved?.length) return cloneAchievements()
  const map = new Map(saved.map(item => [item.id, item]))
  return baseAchievements.map(base => ({
    ...base,
    ...map.get(base.id)
  }))
}

const hydrateModules = (saved: GameModule[] | undefined) => {
  const baseMap = new Map(baseModules.map(module => [module.id, module]))
  if (!saved?.length) return cloneModules()
  return saved.map(module => {
    const base = baseMap.get(module.id)
    if (!base) return module
    const level = module.level ?? (module.unlocked ? 1 : 0)
    return {
      ...base,
      ...module,
      level,
      cost: { ...base.cost, ...module.cost },
      effects: { ...base.effects, ...module.effects },
      upgradeCosts: cloneCosts(base.upgradeCosts),
      requires: base.requires
    }
  })
}

const hydrateDoctrines = (saved: Doctrine[] | undefined) => {
  const baseMap = new Map(baseDoctrines.map(doctrine => [doctrine.id, doctrine]))
  if (!saved?.length) return cloneDoctrines()
  return saved.map(doctrine => {
    const base = baseMap.get(doctrine.id)
    if (!base) return doctrine
    const level = doctrine.level ?? (doctrine.unlocked ? 1 : 0)
    return {
      ...base,
      ...doctrine,
      level,
      cost: { ...base.cost, ...doctrine.cost },
      effects: { ...base.effects, ...doctrine.effects },
      upgradeCosts: cloneCosts(base.upgradeCosts),
      requires: base.requires
    }
  })
}

const hydrateResourceUpgrades = (saved: ResourceUpgrade[] | undefined) => {
  const baseMap = new Map(baseResourceUpgrades.map(upgrade => [upgrade.id, upgrade]))
  if (!saved?.length) return cloneResourceUpgrades()
  return saved.map(upgrade => {
    const base = baseMap.get(upgrade.id)
    if (!base) return upgrade
    const level = upgrade.level ?? (upgrade.unlocked ? 1 : 0)
    return {
      ...base,
      ...upgrade,
      level,
      cost: { ...base.cost, ...upgrade.cost },
      effects: { ...base.effects, ...upgrade.effects },
      upgradeCosts: cloneCosts(base.upgradeCosts),
      requires: base.requires
    }
  })
}

const scaleEffects = (
  effects: GameModule['effects'],
  level: number
): GameModule['effects'] => ({
  attack: effects.attack ? effects.attack * level : undefined,
  defense: effects.defense ? effects.defense * level : undefined,
  plasmaRate: effects.plasmaRate ? effects.plasmaRate * level : undefined,
  masking: effects.masking ? effects.masking * level : undefined,
  energy: effects.energy ? effects.energy * level : undefined,
  integrity: effects.integrity ? effects.integrity * level : undefined
})

export function useGameState() {
  const savedRaw = loadState()
  const saved = savedRaw?.version === 5 ? savedRaw : null

  const day = ref(saved?.day ?? 1)
  const clots = ref(saved?.clots ?? 25)
  const plasma = ref(saved?.plasma ?? 60)
  const essence = ref(saved?.essence ?? 2)
  const energy = ref(saved?.energy ?? 5)
  const threat = ref(saved?.threat ?? 12)
  const masking = ref(saved?.masking ?? 65)
  const integrity = ref(saved?.integrity ?? 100)
  const experience = ref(saved?.experience ?? 0)

  const nodes = ref<GameNode[]>(
    saved?.nodes ? saved.nodes : baseNodes.map(node => ({ ...node }))
  )
  const modules = ref<GameModule[]>(hydrateModules(saved?.modules))
  const doctrines = ref<Doctrine[]>(hydrateDoctrines(saved?.doctrines))
  const resourceUpgrades = ref<ResourceUpgrade[]>(
    hydrateResourceUpgrades(saved?.resourceUpgrades)
  )
  const achievements = ref<Achievement[]>(mergeAchievements(saved?.achievements))
  const selectedDoctrineId = ref<string | null>(
    saved?.selectedDoctrineId ?? null
  )
  const tutorialEnabled = ref(saved?.tutorialEnabled ?? true)
  const tutorialStep = ref(saved?.tutorialStep ?? 0)
  const harvestModeId = ref(saved?.harvestModeId ?? 'balanced')

  const log = ref<Array<{ id: number; message: string; time: string }>>(
    saved?.log ?? []
  )
  const notifications = ref<Notification[]>([])
  const encounter = ref<Encounter | null>(saved?.encounter ?? null)
  const combatState = reactive<CombatState>({
    guarded: saved?.combatState?.guarded ?? false,
    focused: saved?.combatState?.focused ?? false
  })
  const selectedNodeId = ref<string | null>(nodes.value[0]?.id ?? null)

  const levelInfo = computed(() => {
    const currentLevel = levelThresholds.reduce((acc, threshold, index) => {
      return experience.value >= threshold ? index + 1 : acc
    }, 1)
    const currentThreshold =
      levelThresholds[Math.max(0, currentLevel - 1)] ?? 0
    const nextThreshold =
      levelThresholds[Math.min(levelThresholds.length - 1, currentLevel)] ??
      currentThreshold
    const progress =
      nextThreshold === currentThreshold
        ? 1
        : (experience.value - currentThreshold) /
          (nextThreshold - currentThreshold)
    return {
      level: currentLevel,
      currentThreshold,
      nextThreshold,
      progress
    }
  })

  const activeDoctrine = computed(() =>
    doctrines.value.find(
      item => item.id === selectedDoctrineId.value && item.unlocked
    ) ?? null
  )

  const doctrineEffects = computed(() => {
    if (!activeDoctrine.value) return {}
    return scaleEffects(activeDoctrine.value.effects, activeDoctrine.value.level)
  })

  const levelEffects = computed(() => {
    const stage = levelInfo.value.level - 1
    return {
      attack: Math.floor(stage * 0.8),
      defense: Math.floor(stage * 0.4),
      plasmaRate: stage * 0.25,
      masking: stage * 0.6,
      energy: Math.floor(stage / 3),
      integrity: stage * 1.5
    }
  })

  const stats = computed(() => {
    return modules.value.reduce(
      (acc, module) => {
        if (!module.unlocked || module.level <= 0) return acc
        const scaled = scaleEffects(module.effects, module.level)
        acc.attack += scaled.attack ?? 0
        acc.defense += scaled.defense ?? 0
        acc.plasmaRate += scaled.plasmaRate ?? 0
        acc.masking += scaled.masking ?? 0
        acc.energy += scaled.energy ?? 0
        acc.integrity += scaled.integrity ?? 0
        return acc
      },
      {
        attack: levelEffects.value.attack + (doctrineEffects.value.attack ?? 0),
        defense: levelEffects.value.defense + (doctrineEffects.value.defense ?? 0),
        plasmaRate:
          levelEffects.value.plasmaRate +
          (doctrineEffects.value.plasmaRate ?? 0),
        masking: levelEffects.value.masking + (doctrineEffects.value.masking ?? 0),
        energy: levelEffects.value.energy + (doctrineEffects.value.energy ?? 0),
        integrity:
          levelEffects.value.integrity + (doctrineEffects.value.integrity ?? 0)
      }
    )
  })

  const resourceEffects = computed(() =>
    resourceUpgrades.value.reduce(
      (acc, upgrade) => {
        if (!upgrade.unlocked || upgrade.level <= 0) return acc
        const level = upgrade.level
        acc.plasmaYield += (upgrade.effects.plasmaYield ?? 0) * level
        acc.clotYield += (upgrade.effects.clotYield ?? 0) * level
        acc.essenceYield += (upgrade.effects.essenceYield ?? 0) * level
        acc.plasmaCostReduction +=
          (upgrade.effects.plasmaCostReduction ?? 0) * level
        acc.clotCostReduction +=
          (upgrade.effects.clotCostReduction ?? 0) * level
        acc.essenceCostReduction +=
          (upgrade.effects.essenceCostReduction ?? 0) * level
        acc.threatShift += (upgrade.effects.threatShift ?? 0) * level
        acc.experienceBonus += (upgrade.effects.experienceBonus ?? 0) * level
        return acc
      },
      {
        plasmaYield: 0,
        clotYield: 0,
        essenceYield: 0,
        plasmaCostReduction: 0,
        clotCostReduction: 0,
        essenceCostReduction: 0,
        threatShift: 0,
        experienceBonus: 0
      }
    )
  )

  const maxEnergy = computed(() => 6 + stats.value.energy)
  const plasmaRate = computed(() => 1.2 + stats.value.plasmaRate)
  const attackPower = computed(() => 6 + stats.value.attack)
  const defensePower = computed(() => stats.value.defense)
  const maxIntegrity = computed(() => 100 + stats.value.integrity)

  const selectedNode = computed(() =>
    nodes.value.find(node => node.id === selectedNodeId.value) ?? null
  )

  const isGameOver = computed(() => integrity.value <= 0)

  const harvestModes = computed(() => baseHarvestModes)
  const currentHarvestMode = computed(
    () => harvestModes.value.find(mode => mode.id === harvestModeId.value) ??
      harvestModes.value[0]
  )

  const logEvent = (message: string) => {
    log.value.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      message,
      time: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    })
    if (log.value.length > 40) {
      log.value.shift()
    }
  }

  const pushNotification = (
    message: string,
    type: Notification['type'] = 'info'
  ) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    notifications.value.push({ id, message, type })
    if (notifications.value.length > 4) {
      notifications.value.shift()
    }
    window.setTimeout(() => {
      notifications.value = notifications.value.filter(item => item.id !== id)
    }, 3800)
  }

  const unlockAchievement = (id: string) => {
    const achievement = achievements.value.find(item => item.id === id)
    if (!achievement || achievement.unlocked) return
    achievement.unlocked = true
    pushNotification(`Достижение открыто: ${achievement.title}.`, 'success')
    logEvent(`Достижение: ${achievement.title}.`)
  }

  const updateAchievementProgress = (id: string, value: number) => {
    const achievement = achievements.value.find(item => item.id === id)
    if (!achievement || achievement.unlocked || !achievement.target) return
    achievement.progress = Math.min(value, achievement.target)
    if (achievement.progress >= achievement.target) {
      unlockAchievement(id)
    }
  }

  const advanceTutorial = (step: number) => {
    if (!tutorialEnabled.value) return
    if (tutorialStep.value === step) {
      tutorialStep.value = Math.min(
        tutorialSteps.length,
        tutorialStep.value + 1
      )
      if (tutorialStep.value >= tutorialSteps.length) {
        unlockAchievement('tutorial-complete')
      }
    }
  }

  const gainExperience = (amount: number, reason?: string) => {
    if (amount <= 0) return
    const bonus = 1 + resourceEffects.value.experienceBonus
    const adjusted = Math.round(amount * bonus)
    experience.value += adjusted
    if (reason) {
      logEvent(`${reason} +${adjusted} опыта.`)
    }
  }

  const canAfford = (cost: GameModule['cost']) => {
    const check = (value: number, required?: number) =>
      required ? value >= required : true
    return (
      check(clots.value, cost.clots) &&
      check(plasma.value, cost.plasma) &&
      check(essence.value, cost.essence)
    )
  }

  const spendCost = (cost: GameModule['cost']) => {
    if (cost.clots) clots.value -= cost.clots
    if (cost.plasma) plasma.value -= cost.plasma
    if (cost.essence) essence.value -= cost.essence
  }

  const hasRequirements = (requires?: string[]) => {
    if (!requires?.length) return true
    return requires.every(id =>
      modules.value.find(module => module.id === id && module.unlocked)
    )
  }

  const hasDoctrineRequirements = (requires?: string[]) => {
    if (!requires?.length) return true
    return requires.every(id =>
      doctrines.value.find(doctrine => doctrine.id === id && doctrine.unlocked)
    )
  }

  const hasResourceRequirements = (requires?: string[]) => {
    if (!requires?.length) return true
    return requires.every(id =>
      resourceUpgrades.value.find(upgrade => upgrade.id === id && upgrade.unlocked)
    )
  }

  const getModuleUpgradeCost = (module: GameModule) =>
    module.upgradeCosts[module.level - 1]

  const unlockModule = (moduleId: string) => {
    const module = modules.value.find(item => item.id === moduleId)
    if (!module || module.unlocked) return
    if (!hasRequirements(module.requires)) {
      pushNotification('Нужны предыдущие модули ветки.', 'warning')
      return
    }
    if (!canAfford(module.cost)) {
      pushNotification('Недостаточно ресурсов для модуля.', 'warning')
      return
    }
    spendCost(module.cost)
    module.unlocked = true
    module.level = 1
    logEvent(`Модуль «${module.name}» интегрирован в ядро.`)
    pushNotification(`Модуль «${module.name}» активирован.`, 'success')
    unlockAchievement('first-module')
    advanceTutorial(2)
  }

  const upgradeModule = (moduleId: string) => {
    const module = modules.value.find(item => item.id === moduleId)
    if (!module || !module.unlocked || module.level >= module.maxLevel) return
    const upgradeCost = getModuleUpgradeCost(module)
    if (!upgradeCost || !canAfford(upgradeCost)) {
      pushNotification('Недостаточно ресурсов для улучшения.', 'warning')
      return
    }
    spendCost(upgradeCost)
    module.level += 1
    logEvent(`Модуль «${module.name}» улучшен до ${module.level} уровня.`)
    pushNotification(`Модуль «${module.name}» усилен.`, 'success')
  }

  const getDoctrineUpgradeCost = (doctrine: Doctrine) =>
    doctrine.upgradeCosts[doctrine.level - 1]

  const unlockDoctrine = (doctrineId: string) => {
    const doctrine = doctrines.value.find(item => item.id === doctrineId)
    if (!doctrine || doctrine.unlocked) return
    if (!hasDoctrineRequirements(doctrine.requires)) {
      pushNotification('Сначала укрепите базовую доктрину.', 'warning')
      return
    }
    if (!canAfford(doctrine.cost)) {
      pushNotification('Недостаточно ресурсов для доктрины.', 'warning')
      return
    }
    spendCost(doctrine.cost)
    doctrine.unlocked = true
    doctrine.level = 1
    selectedDoctrineId.value = doctrine.id
    logEvent(`Вы выбрали ${doctrine.name}.`)
    pushNotification(`Доктрина «${doctrine.name}» принята.`, 'success')
    unlockAchievement('first-doctrine')
    advanceTutorial(4)
  }

  const upgradeDoctrine = (doctrineId: string) => {
    const doctrine = doctrines.value.find(item => item.id === doctrineId)
    if (!doctrine || !doctrine.unlocked || doctrine.level >= doctrine.maxLevel) {
      return
    }
    const upgradeCost = getDoctrineUpgradeCost(doctrine)
    if (!upgradeCost || !canAfford(upgradeCost)) {
      pushNotification('Недостаточно ресурсов для усиления доктрины.', 'warning')
      return
    }
    spendCost(upgradeCost)
    doctrine.level += 1
    logEvent(`Доктрина «${doctrine.name}» усилена до ${doctrine.level} уровня.`)
    pushNotification('Доктрина усилена.', 'success')
  }

  const activateDoctrine = (doctrineId: string) => {
    const doctrine = doctrines.value.find(item => item.id === doctrineId)
    if (!doctrine || !doctrine.unlocked) return
    selectedDoctrineId.value = doctrine.id
    logEvent(`Активирована доктрина ${doctrine.name}.`)
  }

  const getResourceUpgradeCost = (upgrade: ResourceUpgrade) =>
    upgrade.upgradeCosts[upgrade.level - 1]

  const unlockResourceUpgrade = (upgradeId: string) => {
    const upgrade = resourceUpgrades.value.find(item => item.id === upgradeId)
    if (!upgrade || upgrade.unlocked) return
    if (!hasResourceRequirements(upgrade.requires)) {
      pushNotification('Нужно открыть предыдущий уровень ветки.', 'warning')
      return
    }
    if (!canAfford(upgrade.cost)) {
      pushNotification('Недостаточно ресурсов для технологии.', 'warning')
      return
    }
    spendCost(upgrade.cost)
    upgrade.unlocked = true
    upgrade.level = 1
    logEvent(`Технология «${upgrade.name}» активирована.`)
    pushNotification('Технология добычи открыта.', 'success')
  }

  const upgradeResourceUpgrade = (upgradeId: string) => {
    const upgrade = resourceUpgrades.value.find(item => item.id === upgradeId)
    if (!upgrade || !upgrade.unlocked || upgrade.level >= upgrade.maxLevel) return
    const upgradeCost = getResourceUpgradeCost(upgrade)
    if (!upgradeCost || !canAfford(upgradeCost)) {
      pushNotification('Недостаточно ресурсов для улучшения.', 'warning')
      return
    }
    spendCost(upgradeCost)
    upgrade.level += 1
    logEvent(`Технология «${upgrade.name}» улучшена.`)
    pushNotification('Технология улучшена.', 'success')
  }

  const spendEnergy = (amount = 1) => {
    if (energy.value < amount) {
      pushNotification('Недостаточно энергии для действия.', 'warning')
      logEvent('Не хватает энергии для действия.')
      return false
    }
    energy.value -= amount
    return true
  }

  const gatherPlasma = () => {
    const mode = currentHarvestMode.value
    if (!spendEnergy(mode.energyCost)) return
    const baseGain = 14 + stats.value.plasmaRate * 3
    const upgradeBonus = 1 + resourceEffects.value.plasmaYield
    const gained = Math.round(baseGain * mode.plasmaMultiplier * upgradeBonus)
    plasma.value += gained
    threat.value = Math.min(100, threat.value + mode.threatDelta)
    masking.value = Math.max(0, Math.min(100, masking.value + mode.maskingDelta))
    gainExperience(3)
    logEvent(`Сбор плазмы: +${gained}.`)
    unlockAchievement('first-harvest')
    advanceTutorial(0)
  }

  const refineClots = () => {
    if (!spendEnergy(1)) return
    const baseCost = 18
    const baseYield = 6
    const reduction = resourceEffects.value.plasmaCostReduction
    const required = Math.max(10, Math.round(baseCost * (1 - reduction)))
    if (plasma.value < required) {
      logEvent('Недостаточно плазмы для синтеза.')
      pushNotification('Нужно больше плазмы для синтеза.', 'warning')
      return
    }
    plasma.value -= required
    const output = Math.round(baseYield * (1 + resourceEffects.value.clotYield))
    clots.value += output
    gainExperience(4)
    logEvent(`Синтез сгустков: +${output}.`)
    advanceTutorial(1)
  }

  const transmuteEssence = () => {
    if (!spendEnergy(2)) return
    const baseCost = 12
    const baseYield = 3
    const reduction = resourceEffects.value.clotCostReduction
    const required = Math.max(6, Math.round(baseCost * (1 - reduction)))
    if (clots.value < required) {
      logEvent('Нужны сгустки для возгонки эссенции.')
      pushNotification('Не хватает сгустков для эссенции.', 'warning')
      return
    }
    clots.value -= required
    const output = Math.round(
      baseYield * (1 + resourceEffects.value.essenceYield)
    )
    essence.value += output
    gainExperience(6)
    logEvent(`Возгонка эссенции: +${output}.`)
  }

  const reinforceMasking = () => {
    if (!spendEnergy(1)) return
    if (essence.value < 2) {
      logEvent('Не хватает эссенции для маскировки.')
      pushNotification('Нужна эссенция для маскировки.', 'warning')
      return
    }
    essence.value -= 2
    masking.value = Math.min(100, masking.value + 6)
    threat.value = Math.max(0, threat.value - 8)
    gainExperience(4)
    logEvent('Контур маскировки укреплён.')
  }

  const scanFlow = () => {
    if (!spendEnergy(1)) return
    threat.value = Math.max(0, threat.value - 6)
    const roll = Math.random()
    if (roll > 0.7) {
      unlockNextNode()
    }
    gainExperience(5)
    logEvent('Проведена разведка потока. Угроза снижена.')
  }

  const stabilizeCore = () => {
    if (!spendEnergy(2)) return
    const cost = { plasma: 20, essence: 1 }
    if (!canAfford(cost)) {
      logEvent('Недостаточно ресурсов для регенерации ядра.')
      pushNotification('Нужны плазма и эссенция для регенерации.', 'warning')
      return
    }
    spendCost(cost)
    integrity.value = Math.min(maxIntegrity.value, integrity.value + 10)
    gainExperience(6)
    logEvent('Ядро стабилизировано, целостность восстановлена.')
  }

  const advanceFront = () => {
    if (!spendEnergy(2)) return
    const cost = { essence: 4 }
    if (!canAfford(cost)) {
      logEvent('Недостаточно эссенции для прорыва.')
      pushNotification('Нужна эссенция для прорыва фронтира.', 'warning')
      return
    }
    spendCost(cost)
    const unlocked = unlockNextNode()
    threat.value = Math.min(100, threat.value + 6)
    gainExperience(8)
    if (unlocked) {
      logEvent('Фронтир расширен, новые маршруты открыты.')
    } else {
      logEvent('Все текущие сектора уже обнаружены.')
    }
  }

  const setHarvestMode = (modeId: string) => {
    if (harvestModes.value.some(mode => mode.id === modeId)) {
      harvestModeId.value = modeId
      logEvent(
        `Режим добычи: ${
          harvestModes.value.find(mode => mode.id === modeId)?.name ?? ''
        }.`
      )
    }
  }

  const unlockNextNode = () => {
    const next = nodes.value.find(node => !node.discovered)
    if (next) {
      next.discovered = true
      logEvent(`Обнаружен новый сектор: ${next.name}.`)
      return true
    }
    return false
  }

  const resolveNodeReward = (reward?: GameNode['reward']) => {
    if (!reward) return
    if (reward.plasma) plasma.value += reward.plasma
    if (reward.clots) clots.value += reward.clots
    if (reward.essence) essence.value += reward.essence
    if (reward.experience) gainExperience(reward.experience)
    if (reward.moduleId) {
      const module = modules.value.find(item => item.id === reward.moduleId)
      if (module && !module.unlocked) {
        module.unlocked = true
        module.level = 1
        logEvent(`Найден уникальный модуль: ${module.name}.`)
        unlockAchievement('first-module')
      }
    }
  }

  const rollEnemyIntent = (difficulty: number): EnemyIntent => {
    const intents: EnemyIntent[] = [
      { id: 'strike', label: 'Пульсирующий удар', multiplier: 1, threat: 3 },
      { id: 'heavy', label: 'Тяжёлый выпад', multiplier: 1.4, threat: 5 },
      {
        id: 'pierce',
        label: 'Пробивающий импульс',
        multiplier: 1.2,
        threat: 4,
        pierce: true
      },
      {
        id: 'drain',
        label: 'Истощающий контакт',
        multiplier: 0.9,
        threat: 4,
        drain: 0.8
      }
    ]
    const bias = Math.min(intents.length - 1, Math.floor(difficulty / 2))
    const roll = Math.random() * intents.length
    const index = Math.min(intents.length - 1, Math.floor(roll + bias * 0.3))
    return intents[index]
  }

  const exploreNode = () => {
    const node = selectedNode.value
    if (!node || node.cleared) return
    if (!spendEnergy(2)) return

    if (node.type === 'battle' || node.type === 'boss') {
      const baseHp = node.type === 'boss' ? 80 : 38
      encounter.value = {
        nodeId: node.id,
        enemyName: node.type === 'boss' ? 'Страж коры' : 'Иммунный охотник',
        hp: baseHp + node.difficulty * 8,
        maxHp: baseHp + node.difficulty * 8,
        attack: 7 + node.difficulty * 2.4,
        intent: rollEnemyIntent(node.difficulty),
        reward: node.reward
      }
      combatState.focused = false
      combatState.guarded = false
      logEvent(`Контакт с угрозой: ${encounter.value.enemyName}.`)
      pushNotification('Началась схватка. Проверьте боевой контур.', 'info')
      return
    }

    node.cleared = true
    resolveNodeReward(node.reward)
    unlockNextNode()
    gainExperience(10)
    logEvent(`Сектор «${node.name}» стабилизирован.`)
    unlockAchievement('sector-clear')
    advanceTutorial(3)
  }

  const applyCombatDamage = (base: number) => {
    const focusBonus = combatState.focused ? 1.35 : 1
    const critChance = 0.1 + levelInfo.value.level * 0.02
    const isCrit = Math.random() < critChance
    const damage = Math.floor(base * focusBonus * (isCrit ? 1.8 : 1))
    combatState.focused = false
    return { damage, isCrit }
  }

  const resolveEnemyTurn = () => {
    if (!encounter.value) return
    const node = nodes.value.find(item => item.id === encounter.value?.nodeId)
    const intent = encounter.value.intent
    let damage = encounter.value.attack * intent.multiplier
    if (!intent.pierce) {
      damage = Math.max(1, damage - defensePower.value)
    } else {
      damage = Math.max(1, damage - defensePower.value * 0.3)
    }

    if (combatState.guarded) {
      damage *= 0.55
      combatState.guarded = false
      logEvent('Щит гасит часть урона.')
    }

    const finalDamage = Math.max(1, Math.floor(damage))
    integrity.value = Math.max(0, integrity.value - finalDamage)
    threat.value = Math.min(100, threat.value + intent.threat)

    if (intent.drain) {
      energy.value = Math.max(0, energy.value - intent.drain)
      logEvent('Противник истощает энергию цитадели.')
    }

    logEvent(`Ответный ход: ${intent.label} (-${finalDamage}).`)

    if (node) {
      encounter.value.intent = rollEnemyIntent(node.difficulty)
    }
  }

  const closeEncounter = () => {
    encounter.value = null
    combatState.focused = false
    combatState.guarded = false
  }

  const attackEnemy = () => {
    if (!encounter.value) return
    if (!spendEnergy(1)) return

    const { damage, isCrit } = applyCombatDamage(
      attackPower.value + Math.floor(Math.random() * 5)
    )
    encounter.value.hp = Math.max(0, encounter.value.hp - damage)
    logEvent(`Пульс-удар: -${damage}${isCrit ? ' (крит)' : ''}.`)

    if (encounter.value.hp <= 0) {
      const node = nodes.value.find(item => item.id === encounter.value?.nodeId)
      if (node) {
        node.cleared = true
        resolveNodeReward(encounter.value.reward)
        unlockNextNode()
        gainExperience(24)
      }
      logEvent(`Угроза нейтрализована: ${encounter.value.enemyName}.`)
      closeEncounter()
      unlockAchievement('battle-win')
      advanceTutorial(5)
      return
    }

    resolveEnemyTurn()
  }

  const burst = () => {
    if (!encounter.value) return
    if (!spendEnergy(2)) return
    if (clots.value < 6) {
      logEvent('Недостаточно сгустков для всплеска.')
      pushNotification('Не хватает сгустков для всплеска.', 'warning')
      return
    }
    clots.value -= 6
    const { damage, isCrit } = applyCombatDamage(attackPower.value + 12)
    encounter.value.hp = Math.max(0, encounter.value.hp - damage)
    logEvent(`Гемо-всплеск: -${damage}${isCrit ? ' (крит)' : ''}.`)

    if (encounter.value.hp <= 0) {
      const node = nodes.value.find(item => item.id === encounter.value?.nodeId)
      if (node) {
        node.cleared = true
        resolveNodeReward(encounter.value.reward)
        unlockNextNode()
        gainExperience(30)
      }
      logEvent(`Угроза нейтрализована: ${encounter.value.enemyName}.`)
      closeEncounter()
      unlockAchievement('battle-win')
      advanceTutorial(5)
      return
    }

    resolveEnemyTurn()
  }

  const focus = () => {
    if (!encounter.value) return
    if (!spendEnergy(1)) return
    combatState.focused = true
    logEvent('Фокусировка повышает следующий удар.')
    resolveEnemyTurn()
  }

  const guard = () => {
    if (!encounter.value) return
    if (!spendEnergy(1)) return
    combatState.guarded = true
    logEvent('Активирован щит на следующий ход противника.')
    resolveEnemyTurn()
  }

  const retreat = () => {
    if (!encounter.value) return
    closeEncounter()
    threat.value = Math.min(100, threat.value + 8)
    logEvent('Отступление. Угроза возросла.')
    pushNotification('Вы отступили. Угроза выросла.', 'info')
  }

  const tick = () => {
    if (isGameOver.value) return
    day.value += 1
    plasma.value += plasmaRate.value
    energy.value = Math.min(maxEnergy.value, energy.value + 0.6)
    masking.value = Math.max(0, masking.value - 0.4)
    threat.value = Math.min(
      100,
      threat.value + Math.max(0, 0.6 - stats.value.masking * 0.05) +
        resourceEffects.value.threatShift
    )

    if (threat.value >= 90) {
      integrity.value = Math.max(0, integrity.value - 4)
      logEvent('Иммунная буря пробивает оборону.')
    }
  }

  const createSavePayload = () => ({
    version: 5,
    day: day.value,
    clots: clots.value,
    plasma: plasma.value,
    essence: essence.value,
    energy: energy.value,
    threat: threat.value,
    masking: masking.value,
    integrity: integrity.value,
    experience: experience.value,
    nodes: nodes.value,
    modules: modules.value,
    doctrines: doctrines.value,
    resourceUpgrades: resourceUpgrades.value,
    achievements: achievements.value,
    log: log.value,
    encounter: encounter.value,
    combatState,
    selectedDoctrineId: selectedDoctrineId.value,
    tutorialEnabled: tutorialEnabled.value,
    tutorialStep: tutorialStep.value,
    harvestModeId: harvestModeId.value
  })

  const resetGame = () => {
    day.value = 1
    clots.value = 25
    plasma.value = 60
    essence.value = 2
    energy.value = 5
    threat.value = 12
    masking.value = 65
    experience.value = 0
    nodes.value = baseNodes.map(node => ({ ...node }))
    modules.value = cloneModules()
    doctrines.value = cloneDoctrines()
    resourceUpgrades.value = cloneResourceUpgrades()
    achievements.value = cloneAchievements()
    selectedDoctrineId.value = null
    tutorialEnabled.value = true
    tutorialStep.value = 0
    harvestModeId.value = 'balanced'
    encounter.value = null
    combatState.guarded = false
    combatState.focused = false
    integrity.value = 100
    log.value = []
    selectedNodeId.value = nodes.value[0]?.id ?? null
    saveState(createSavePayload())
    logEvent('Цикл перезапущен. Все показатели обнулены.')
  }

  const generateSaveCode = () => {
    const payload = createSavePayload()
    return encodeSave(payload)
  }

  const applySavePayload = (payload: Record<string, unknown>) => {
    if (!payload || typeof payload !== 'object') return false
    day.value = Number(payload.day ?? day.value)
    clots.value = Number(payload.clots ?? clots.value)
    plasma.value = Number(payload.plasma ?? plasma.value)
    essence.value = Number(payload.essence ?? essence.value)
    energy.value = Number(payload.energy ?? energy.value)
    threat.value = Number(payload.threat ?? threat.value)
    masking.value = Number(payload.masking ?? masking.value)
    integrity.value = Number(payload.integrity ?? integrity.value)
    experience.value = Number(payload.experience ?? experience.value)
    if (Array.isArray(payload.nodes)) {
      nodes.value = payload.nodes as GameNode[]
    } else {
      nodes.value = baseNodes.map(node => ({ ...node }))
    }
    modules.value = hydrateModules(payload.modules as GameModule[] | undefined)
    doctrines.value = hydrateDoctrines(payload.doctrines as Doctrine[] | undefined)
    resourceUpgrades.value = hydrateResourceUpgrades(
      payload.resourceUpgrades as ResourceUpgrade[] | undefined
    )
    achievements.value = mergeAchievements(payload.achievements as Achievement[])
    if (Array.isArray(payload.log)) {
      log.value = payload.log as Array<{ id: number; message: string; time: string }>
    }
    selectedDoctrineId.value =
      (payload.selectedDoctrineId as string | null) ?? selectedDoctrineId.value
    tutorialEnabled.value = Boolean(
      payload.tutorialEnabled ?? tutorialEnabled.value
    )
    tutorialStep.value = Number(payload.tutorialStep ?? tutorialStep.value)
    harvestModeId.value = String(payload.harvestModeId ?? harvestModeId.value)
    encounter.value = (payload.encounter as Encounter | null) ?? null
    if (payload.combatState && typeof payload.combatState === 'object') {
      const combat = payload.combatState as CombatState
      combatState.guarded = combat.guarded ?? false
      combatState.focused = combat.focused ?? false
    }
    selectedNodeId.value = nodes.value[0]?.id ?? null
    logEvent('Сохранение загружено.')
    return true
  }

  const loadFromCode = (code: string) => {
    try {
      const payload = decodeSave(code)
      return applySavePayload(payload)
    } catch {
      logEvent('Код сохранения повреждён или неверен.')
      return false
    }
  }

  watch(
    [
      day,
      clots,
      plasma,
      essence,
      energy,
      threat,
      masking,
      integrity,
      experience,
      nodes,
      modules,
      doctrines,
      resourceUpgrades,
      achievements,
      log,
      encounter,
      selectedDoctrineId,
      tutorialEnabled,
      tutorialStep,
      harvestModeId
    ],
    () => {
      saveState(createSavePayload())
    },
    { deep: true }
  )

  watch(
    () => levelInfo.value.level,
    (level, prev) => {
      if (level > prev) {
        logEvent(`Цитадель достигла уровня ${level}.`)
        integrity.value = Math.min(maxIntegrity.value, integrity.value + 6)
        if (level >= 5) {
          unlockAchievement('level-five')
        }
      }
    }
  )

  watch(
    [plasma, clots, essence],
    () => {
      updateAchievementProgress('plasma-collector', plasma.value)
      updateAchievementProgress('clot-master', clots.value)
      updateAchievementProgress('essence-weaver', essence.value)
    },
    { immediate: true }
  )

  return {
    day,
    clots,
    plasma,
    essence,
    energy,
    threat,
    masking,
    integrity,
    experience,
    nodes,
    modules,
    doctrines,
    resourceUpgrades,
    achievements,
    harvestModes,
    harvestModeId,
    selectedDoctrineId,
    log,
    notifications,
    encounter,
    combatState,
    selectedNodeId,
    selectedNode,
    isGameOver,
    maxEnergy,
    plasmaRate,
    attackPower,
    defensePower,
    maxIntegrity,
    levelInfo,
    stats,
    tutorialEnabled,
    tutorialStep,
    tutorialSteps,
    currentHarvestMode,
    unlockModule,
    upgradeModule,
    unlockDoctrine,
    upgradeDoctrine,
    activateDoctrine,
    unlockResourceUpgrade,
    upgradeResourceUpgrade,
    gatherPlasma,
    refineClots,
    transmuteEssence,
    reinforceMasking,
    scanFlow,
    stabilizeCore,
    advanceFront,
    setHarvestMode,
    exploreNode,
    attackEnemy,
    burst,
    focus,
    guard,
    retreat,
    logEvent,
    advanceTutorial,
    pushNotification,
    generateSaveCode,
    loadFromCode,
    resetGame,
    tick
  }
}
