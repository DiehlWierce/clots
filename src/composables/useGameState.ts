import { computed, reactive, ref, watch } from 'vue'

export type NodeType =
  | 'harvest'
  | 'battle'
  | 'ruins'
  | 'forge'
  | 'boss'
  | 'sanctuary'
  | 'relay'

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
  cost: {
    clots?: number
    plasma?: number
    essence?: number
  }
  effects: {
    attack?: number
    defense?: number
    plasmaRate?: number
    masking?: number
    energy?: number
    integrity?: number
  }
  unlocked: boolean
}

export interface Doctrine {
  id: string
  name: string
  description: string
  cost: GameModule['cost']
  effects: GameModule['effects']
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

const STORAGE_KEY = 'clots_game_state_v3'

const levelThresholds = [0, 60, 150, 280, 450, 650, 900, 1200, 1600]

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
  }
]

const baseModules: GameModule[] = [
  {
    id: 'pulse-harvester',
    name: 'Пульс-сборщик',
    description: 'Пассивно увеличивает добычу плазмы каждую секунду.',
    cost: { clots: 12, plasma: 40 },
    effects: { plasmaRate: 1.4 },
    unlocked: false
  },
  {
    id: 'veil-shroud',
    name: 'Пелена маскировки',
    description: 'Снижает рост угрозы и повышает скрытность.',
    cost: { essence: 4, plasma: 25 },
    effects: { masking: 8, defense: 1 },
    unlocked: false
  },
  {
    id: 'hem-arsenal',
    name: 'Гемо-арсенал',
    description: 'Усиливает боевые импульсы и урон по врагу.',
    cost: { clots: 20, essence: 6 },
    effects: { attack: 3 },
    unlocked: false
  },
  {
    id: 'energy-loop',
    name: 'Контур питания',
    description: 'Увеличивает запас энергии и ускоряет восстановление.',
    cost: { plasma: 60, essence: 3 },
    effects: { energy: 2 },
    unlocked: false
  },
  {
    id: 'forge-core',
    name: 'Ядро кузницы',
    description: 'Открывает продвинутые синтезы и улучшает защиту.',
    cost: { clots: 30, essence: 10 },
    effects: { defense: 2, plasmaRate: 0.8 },
    unlocked: false
  },
  {
    id: 'rally-node',
    name: 'Узел концентрации',
    description: 'Поднимает максимальную целостность цитадели.',
    cost: { clots: 28, essence: 8 },
    effects: { integrity: 8 },
    unlocked: false
  },
  {
    id: 'blood-matrix',
    name: 'Матрица сгустков',
    description: 'Укрепляет боевой темп и уменьшает расход сгустков.',
    cost: { clots: 40, plasma: 55 },
    effects: { attack: 2, defense: 1 },
    unlocked: false
  },
  {
    id: 'silent-veil',
    name: 'Тихий покров',
    description: 'Глушит рост угрозы и усиливает маскировку.',
    cost: { plasma: 80, essence: 10 },
    effects: { masking: 12 },
    unlocked: false
  }
]

const baseDoctrines: Doctrine[] = [
  {
    id: 'reaver',
    name: 'Доктрина Пожирателей',
    description: 'Ставка на агрессию и давление, растущий урон и плазму.',
    cost: { essence: 6, plasma: 40 },
    effects: { attack: 2, plasmaRate: 0.8 }
  },
  {
    id: 'warden',
    name: 'Доктрина Стражей',
    description: 'Выживаемость и контроль: защита, маскировка, целостность.',
    cost: { essence: 6, clots: 20 },
    effects: { defense: 2, masking: 6, integrity: 6 }
  },
  {
    id: 'weaver',
    name: 'Доктрина Ткачей',
    description: 'Энергия и темп, ускоряющий экономику и восстановление.',
    cost: { essence: 5, plasma: 30 },
    effects: { energy: 1, plasmaRate: 1.1 }
  }
]

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

export function useGameState() {
  const saved = loadState()

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
    saved?.nodes
      ? saved.nodes
      : baseNodes.map(node => ({ ...node }))
  )
  const modules = ref<GameModule[]>(
    saved?.modules
      ? saved.modules
      : baseModules.map(module => ({ ...module }))
  )
  const doctrines = ref<Doctrine[]>(
    baseDoctrines.map(doctrine => ({ ...doctrine }))
  )
  const selectedDoctrineId = ref<string | null>(
    saved?.selectedDoctrineId ?? null
  )

  const log = ref<Array<{ id: number; message: string; time: string }>>(
    saved?.log ?? []
  )
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

  const doctrineEffects = computed(() => {
    const doctrine = doctrines.value.find(
      item => item.id === selectedDoctrineId.value
    )
    return doctrine?.effects ?? {}
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
        if (!module.unlocked) return acc
        acc.attack += module.effects.attack ?? 0
        acc.defense += module.effects.defense ?? 0
        acc.plasmaRate += module.effects.plasmaRate ?? 0
        acc.masking += module.effects.masking ?? 0
        acc.energy += module.effects.energy ?? 0
        acc.integrity += module.effects.integrity ?? 0
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

  const maxEnergy = computed(() => 6 + stats.value.energy)
  const plasmaRate = computed(() => 1.2 + stats.value.plasmaRate)
  const attackPower = computed(() => 6 + stats.value.attack)
  const defensePower = computed(() => stats.value.defense)
  const maxIntegrity = computed(() => 100 + stats.value.integrity)

  const selectedNode = computed(() =>
    nodes.value.find(node => node.id === selectedNodeId.value) ?? null
  )

  const isGameOver = computed(() => integrity.value <= 0)

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

  const gainExperience = (amount: number, reason?: string) => {
    if (amount <= 0) return
    experience.value += amount
    if (reason) {
      logEvent(`${reason} +${amount} опыта.`)
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

  const buyModule = (moduleId: string) => {
    const module = modules.value.find(item => item.id === moduleId)
    if (!module || module.unlocked || !canAfford(module.cost)) return
    spendCost(module.cost)
    module.unlocked = true
    logEvent(`Модуль «${module.name}» интегрирован в ядро.`)
  }

  const adoptDoctrine = (doctrineId: string) => {
    const doctrine = doctrines.value.find(item => item.id === doctrineId)
    if (!doctrine || !canAfford(doctrine.cost)) return
    spendCost(doctrine.cost)
    selectedDoctrineId.value = doctrine.id
    logEvent(`Вы выбрали ${doctrine.name}.`)
  }

  const spendEnergy = (amount = 1) => {
    if (energy.value < amount) return false
    energy.value -= amount
    return true
  }

  const gatherPlasma = () => {
    if (!spendEnergy(1)) return
    const gained = Math.round(14 + stats.value.plasmaRate * 3)
    plasma.value += gained
    gainExperience(3)
    logEvent(`Сбор плазмы: +${gained}.`)
  }

  const refineClots = () => {
    if (!spendEnergy(1)) return
    const required = 18
    if (plasma.value < required) {
      logEvent('Недостаточно плазмы для синтеза.')
      return
    }
    plasma.value -= required
    clots.value += 6
    gainExperience(4)
    logEvent('Синтез сгустков: +6.')
  }

  const transmuteEssence = () => {
    if (!spendEnergy(2)) return
    if (clots.value < 12) {
      logEvent('Нужны сгустки для возгонки эссенции.')
      return
    }
    clots.value -= 12
    essence.value += 3
    gainExperience(6)
    logEvent('Возгонка эссенции: +3.')
  }

  const reinforceMasking = () => {
    if (!spendEnergy(1)) return
    if (essence.value < 2) {
      logEvent('Не хватает эссенции для маскировки.')
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
        logEvent(`Найден уникальный модуль: ${module.name}.`)
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
      return
    }

    node.cleared = true
    resolveNodeReward(node.reward)
    unlockNextNode()
    gainExperience(10)
    logEvent(`Сектор «${node.name}» стабилизирован.`)
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
      return
    }

    resolveEnemyTurn()
  }

  const burst = () => {
    if (!encounter.value) return
    if (!spendEnergy(2)) return
    if (clots.value < 6) {
      logEvent('Недостаточно сгустков для всплеска.')
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
  }

  const tick = () => {
    if (isGameOver.value) return
    day.value += 1
    plasma.value += plasmaRate.value
    energy.value = Math.min(maxEnergy.value, energy.value + 0.6)
    masking.value = Math.max(0, masking.value - 0.4)
    threat.value = Math.min(
      100,
      threat.value + Math.max(0, 0.6 - stats.value.masking * 0.05)
    )

    if (threat.value >= 90) {
      integrity.value = Math.max(0, integrity.value - 4)
      logEvent('Иммунная буря пробивает оборону.')
    }
  }

  const createSavePayload = () => ({
    version: 3,
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
    log: log.value,
    encounter: encounter.value,
    combatState,
    selectedDoctrineId: selectedDoctrineId.value
  })

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
    }
    if (Array.isArray(payload.modules)) {
      modules.value = payload.modules as GameModule[]
    }
    if (Array.isArray(payload.log)) {
      log.value = payload.log as Array<{ id: number; message: string; time: string }>
    }
    selectedDoctrineId.value =
      (payload.selectedDoctrineId as string | null) ?? selectedDoctrineId.value
    encounter.value = (payload.encounter as Encounter | null) ?? null
    if (payload.combatState && typeof payload.combatState === 'object') {
      const combat = payload.combatState as CombatState
      combatState.guarded = combat.guarded ?? false
      combatState.focused = combat.focused ?? false
    }
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
      log,
      encounter,
      selectedDoctrineId
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
      }
    }
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
    selectedDoctrineId,
    log,
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
    buyModule,
    adoptDoctrine,
    gatherPlasma,
    refineClots,
    transmuteEssence,
    reinforceMasking,
    scanFlow,
    stabilizeCore,
    advanceFront,
    exploreNode,
    attackEnemy,
    burst,
    focus,
    guard,
    retreat,
    logEvent,
    generateSaveCode,
    loadFromCode,
    tick
  }
}
