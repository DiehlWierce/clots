import { computed, reactive, ref, watch } from 'vue'

export type NodeType = 'harvest' | 'battle' | 'ruins' | 'forge' | 'boss'

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
  }
  unlocked: boolean
}

interface Encounter {
  nodeId: string
  enemyName: string
  hp: number
  maxHp: number
  attack: number
  reward?: GameNode['reward']
}

const STORAGE_KEY = 'clots_game_state_v2'

const baseNodes: GameNode[] = [
  {
    id: 'n1',
    name: 'Капиллярный пролив',
    type: 'harvest',
    difficulty: 1,
    discovered: true,
    cleared: false,
    reward: { plasma: 25 }
  },
  {
    id: 'n2',
    name: 'Узел тромбоцитов',
    type: 'battle',
    difficulty: 2,
    discovered: false,
    cleared: false,
    reward: { clots: 10, essence: 2 }
  },
  {
    id: 'n3',
    name: 'Костномозговой рифт',
    type: 'ruins',
    difficulty: 3,
    discovered: false,
    cleared: false,
    reward: { essence: 6 }
  },
  {
    id: 'n4',
    name: 'Кузница эритроцитов',
    type: 'forge',
    difficulty: 3,
    discovered: false,
    cleared: false,
    reward: { moduleId: 'forge-core' }
  },
  {
    id: 'n5',
    name: 'Шторм иммунного патруля',
    type: 'battle',
    difficulty: 4,
    discovered: false,
    cleared: false,
    reward: { clots: 18, essence: 4 }
  },
  {
    id: 'n6',
    name: 'Атриум коры',
    type: 'boss',
    difficulty: 6,
    discovered: false,
    cleared: false,
    reward: { clots: 40, essence: 12 }
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

  const log = ref<Array<{ id: number; message: string; time: string }>>(
    saved?.log ?? []
  )
  const encounter = ref<Encounter | null>(null)
  const selectedNodeId = ref<string | null>(nodes.value[0]?.id ?? null)

  const stats = computed(() => {
    return modules.value.reduce(
      (acc, module) => {
        if (!module.unlocked) return acc
        acc.attack += module.effects.attack ?? 0
        acc.defense += module.effects.defense ?? 0
        acc.plasmaRate += module.effects.plasmaRate ?? 0
        acc.masking += module.effects.masking ?? 0
        acc.energy += module.effects.energy ?? 0
        return acc
      },
      {
        attack: 0,
        defense: 0,
        plasmaRate: 0,
        masking: 0,
        energy: 0
      }
    )
  })

  const maxEnergy = computed(() => 6 + stats.value.energy)
  const plasmaRate = computed(() => 1.2 + stats.value.plasmaRate)
  const attackPower = computed(() => 6 + stats.value.attack)
  const defensePower = computed(() => stats.value.defense)

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

  const spendEnergy = (amount = 1) => {
    if (energy.value < amount) return false
    energy.value -= amount
    return true
  }

  const gatherPlasma = () => {
    if (!spendEnergy(1)) return
    const gained = Math.round(14 + stats.value.plasmaRate * 3)
    plasma.value += gained
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
    logEvent('Контур маскировки укреплён.')
  }

  const unlockNextNode = () => {
    const next = nodes.value.find(node => !node.discovered)
    if (next) {
      next.discovered = true
      logEvent(`Обнаружен новый сектор: ${next.name}.`)
    }
  }

  const resolveNodeReward = (reward?: GameNode['reward']) => {
    if (!reward) return
    if (reward.plasma) plasma.value += reward.plasma
    if (reward.clots) clots.value += reward.clots
    if (reward.essence) essence.value += reward.essence
    if (reward.moduleId) {
      const module = modules.value.find(item => item.id === reward.moduleId)
      if (module && !module.unlocked) {
        module.unlocked = true
        logEvent(`Найден уникальный модуль: ${module.name}.`)
      }
    }
  }

  const exploreNode = () => {
    const node = selectedNode.value
    if (!node || node.cleared) return
    if (!spendEnergy(2)) return

    if (node.type === 'battle' || node.type === 'boss') {
      const baseHp = node.type === 'boss' ? 60 : 30
      encounter.value = {
        nodeId: node.id,
        enemyName: node.type === 'boss' ? 'Страж коры' : 'Иммунный охотник',
        hp: baseHp + node.difficulty * 6,
        maxHp: baseHp + node.difficulty * 6,
        attack: 6 + node.difficulty * 2,
        reward: node.reward
      }
      logEvent(`Контакт с угрозой: ${encounter.value.enemyName}.`)
      return
    }

    node.cleared = true
    resolveNodeReward(node.reward)
    unlockNextNode()
    logEvent(`Сектор «${node.name}» стабилизирован.`)
  }

  const attackEnemy = () => {
    if (!encounter.value) return
    if (!spendEnergy(1)) return

    const damage = attackPower.value + Math.floor(Math.random() * 4)
    encounter.value.hp = Math.max(0, encounter.value.hp - damage)
    logEvent(`Удар пульсом: -${damage} к цели.`)

    if (encounter.value.hp <= 0) {
      const node = nodes.value.find(item => item.id === encounter.value?.nodeId)
      if (node) {
        node.cleared = true
        resolveNodeReward(encounter.value.reward)
        unlockNextNode()
      }
      logEvent(`Угроза нейтрализована: ${encounter.value.enemyName}.`)
      encounter.value = null
      return
    }

    const counter = Math.max(
      1,
      encounter.value.attack - defensePower.value
    )
    integrity.value = Math.max(0, integrity.value - counter)
    threat.value = Math.min(100, threat.value + 3)
    logEvent(`Ответный удар: -${counter} к целостности.`)
  }

  const burst = () => {
    if (!encounter.value) return
    if (!spendEnergy(2)) return
    if (clots.value < 6) {
      logEvent('Недостаточно сгустков для всплеска.')
      return
    }
    clots.value -= 6
    const damage = attackPower.value + 10
    encounter.value.hp = Math.max(0, encounter.value.hp - damage)
    logEvent(`Гемовсплеск: -${damage} к цели.`)
  }

  const retreat = () => {
    if (!encounter.value) return
    encounter.value = null
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
      nodes,
      modules,
      log
    ],
    () => {
      saveState({
        day: day.value,
        clots: clots.value,
        plasma: plasma.value,
        essence: essence.value,
        energy: energy.value,
        threat: threat.value,
        masking: masking.value,
        integrity: integrity.value,
        nodes: nodes.value,
        modules: modules.value,
        log: log.value
      })
    },
    { deep: true }
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
    nodes,
    modules,
    log,
    encounter,
    selectedNodeId,
    selectedNode,
    isGameOver,
    maxEnergy,
    plasmaRate,
    attackPower,
    defensePower,
    stats,
    buyModule,
    gatherPlasma,
    refineClots,
    transmuteEssence,
    reinforceMasking,
    exploreNode,
    attackEnemy,
    burst,
    retreat,
    logEvent,
    tick
  }
}
