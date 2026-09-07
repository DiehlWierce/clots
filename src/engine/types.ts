/**
 * Типы игрового движка Clots: Hem Empire.
 *
 * Движок не знает ничего про React и DOM: это чистые данные + чистые функции.
 * Всё, что меняется во времени, живёт в GameState; весь статический контент —
 * в src/engine/content и в состояние никогда не копируется.
 */

// ─── Ресурсы ────────────────────────────────────────────────────────────────

export type ResourceId = 'plasma' | 'clots' | 'essence'

export type ResourceBag = Partial<Record<ResourceId, number>>

// ─── Карта ──────────────────────────────────────────────────────────────────

export type RegionId = 'capillary' | 'venous' | 'arterial' | 'cortex'

export type SectorType =
  | 'harvest' // добыча плазмы
  | 'refinery' // переработка в сгустки
  | 'sanctum' // эссенция и снижение угрозы
  | 'relay' // энергия и разведка
  | 'bastion' // защита и целостность
  | 'vault' // разовый выбор награды
  | 'forge' // выдаёт уникальный модуль
  | 'nexus' // босс региона

/** Постоянный доход, который сектор приносит за цикл после захвата. */
export interface SectorYield {
  plasma?: number
  clots?: number
  essence?: number
  energy?: number
  defense?: number
  integrity?: number
  /** Снижение прироста угрозы (санктумы). */
  suppression?: number
}

export interface SectorDef {
  id: string
  name: string
  region: RegionId
  type: SectorType
  /** Влияет на силу гарнизона и размер награды. */
  difficulty: number
  /** Сколько угрозы сектор добавляет за цикл после захвата. */
  heat: number
  description: string
  /** Постоянный доход за цикл. */
  income?: SectorYield
  /** Разовая награда за захват. */
  bounty?: ResourceBag & { xp?: number }
  /** Гарнизон: если задан — сектор берётся только боем. */
  garrison?: string
  /** Модуль, который выдаёт кузница. */
  grantsModule?: string
  /** Варианты выбора для хранилища. */
  cache?: VaultOption[]
}

export interface VaultOption {
  id: string
  label: string
  description: string
  reward: ResourceBag & { xp?: number; integrity?: number; maxEnergy?: number }
}

// ─── Развитие ───────────────────────────────────────────────────────────────

/** Эффекты, складывающиеся в итоговые характеристики цитадели. */
export interface CitadelEffects {
  attack?: number
  defense?: number
  maxIntegrity?: number
  maxEnergy?: number
  /** Базовый прирост маскировки за цикл. */
  masking?: number
  /** Множители добычи, доля: 0.15 = +15%. */
  plasmaYield?: number
  clotYield?: number
  essenceYield?: number
  /** Доля снижения прироста угрозы. */
  suppression?: number
  xpYield?: number
  /** Пробитие брони в бою. */
  pierce?: number
  /** Восстановление целостности за цикл. */
  regen?: number
}

export interface ModuleDef {
  id: string
  name: string
  description: string
  branch: string
  tier: number
  maxLevel: number
  /** Стоимость каждого уровня: costs[0] — открытие, costs[1] — 2-й уровень и т.д. */
  costs: ResourceBag[]
  /** Эффекты за один уровень; умножаются на текущий уровень. */
  effects: CitadelEffects
  requires?: string[]
}

export interface DoctrineDef {
  id: string
  name: string
  description: string
  /** Ветка-путь: выбрав одну, остальные закрываются навсегда. */
  path: DoctrinePath
  tier: number
  maxLevel: number
  costs: ResourceBag[]
  effects: CitadelEffects
  requires?: string[]
}

export type DoctrinePath = 'reaver' | 'warden' | 'weaver'

export interface TechDef {
  id: string
  name: string
  description: string
  branch: string
  tier: number
  maxLevel: number
  costs: ResourceBag[]
  effects: CitadelEffects
  requires?: string[]
}

// ─── Бой ────────────────────────────────────────────────────────────────────

export type IntentKind = 'strike' | 'heavy' | 'pierce' | 'drain' | 'shield' | 'regen' | 'summon'

export interface IntentDef {
  kind: IntentKind
  label: string
  description: string
  /** Множитель к атаке врага. */
  power: number
  /** Сколько угрозы добавляет ход врага. */
  threat: number
  /** Игнорирует долю защиты (0..1). */
  ignoreDefense?: number
  /** Сжигает энергию цитадели. */
  drainEnergy?: number
  /** Восстанавливает врагу здоровье. */
  healSelf?: number
  /** Добавляет врагу временный щит. */
  shieldSelf?: number
}

export interface EnemyDef {
  id: string
  name: string
  title: string
  description: string
  hp: number
  attack: number
  /** Плоская броня: снижает урон игрока, снимается «Вскрытием». */
  armor: number
  /** Регенерация врага за ход. */
  regen?: number
  /** Порядок намерений, повторяется по кругу — телеграфируется игроку. */
  pattern: IntentKind[]
  /** Действие, к которому враг уязвим: урон ×1.5. */
  weakness?: PlayerCombatAction
}

export type PlayerCombatAction = 'strike' | 'surge' | 'focus' | 'guard' | 'rupture'

export interface CombatState {
  sectorId: string
  enemyId: string
  hp: number
  maxHp: number
  attack: number
  armor: number
  /** Броня, снятая «Вскрытием» на этот бой. */
  armorBroken: number
  shield: number
  /** Индекс следующего намерения в pattern. */
  intentIndex: number
  focused: boolean
  guarded: boolean
  round: number
  /** Бой навязан рейдом: отступление невозможно. */
  forced: boolean
}

// ─── Прочее ─────────────────────────────────────────────────────────────────

export interface MutationDef {
  id: string
  name: string
  /** Короткая формула компромисса — показывается под названием. */
  tagline: string
  description: string
  /** Постоянные модификаторы характеристик. */
  effects: CitadelEffects
  /** Множитель «шума» территории: 2 — вдвое громче, 0.5 — вдвое тише. */
  heatMultiplier?: number
  /** Множитель силы рейдов. */
  raidPower?: number
  /** Разовая прибавка к стартовым ресурсам. */
  startBonus?: ResourceBag
  /** Стартовый уровень угрозы, если он должен отличаться от обычного. */
  startThreat?: number
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Накопительная цель; если не задана — достижение бинарное. */
  target?: number
  secret?: boolean
}

export interface LoreChapter {
  id: string
  title: string
  /** Условие открытия главы. */
  unlock: LoreUnlock
  paragraphs: string[]
}

export type LoreUnlock =
  | { kind: 'always' }
  | { kind: 'cycle'; value: number }
  | { kind: 'level'; value: number }
  | { kind: 'region'; value: RegionId }
  | { kind: 'sector'; value: string }
  | { kind: 'achievement'; value: string }

export interface LoreEra {
  id: string
  title: string
  period: string
  summary: string
  chapters: LoreChapter[]
}

export interface LogEntry {
  id: number
  cycle: number
  message: string
  tone: 'info' | 'good' | 'bad'
}

export type Phase = 'mutation' | 'command' | 'combat' | 'vault' | 'collapsed' | 'victory'

/** Прогресс покупаемой вещи: 0 — не открыто. */
export type LevelMap = Record<string, number>

export interface GameState {
  /** Версия схемы состояния; используется миграциями сейвов. */
  version: number
  /** Зерно детерминированного ГСЧ. */
  seed: number
  /** Счётчик обращений к ГСЧ: позволяет воспроизвести партию по (seed, rngCursor). */
  rngCursor: number

  cycle: number
  phase: Phase

  plasma: number
  clots: number
  essence: number
  energy: number
  integrity: number
  threat: number
  masking: number
  xp: number

  /** id → уровень. Отсутствие ключа = не открыто. */
  modules: LevelMap
  doctrines: LevelMap
  techs: LevelMap

  /** Выбранный путь доктрин; после выбора не меняется. */
  doctrinePath: DoctrinePath | null

  /** Захваченные секторы. */
  controlled: string[]
  /** Разведанные, но ещё не захваченные секторы. */
  revealed: string[]
  /** Открытые регионы. */
  regions: RegionId[]
  /** Сектор, выбранный в интерфейсе карты. */
  selectedSector: string | null

  combat: CombatState | null
  /** Открытое хранилище, ждущее выбора награды. */
  pendingVault: string | null

  /** Выбранная стартовая мутация. */
  mutation: string | null
  /** Три варианта мутации, предложенные на старте. */
  mutationOffer: string[]

  achievements: LevelMap
  log: LogEntry[]
  /** Открытые главы лора. */
  lore: string[]

  tutorialStep: number
  tutorialDismissed: boolean

  stats: RunStats
}

/** Накопительная статистика забега — для достижений и экрана итогов. */
export interface RunStats {
  battlesWon: number
  battlesLost: number
  sectorsTaken: number
  raidsSurvived: number
  plasmaEarned: number
  clotsEarned: number
  essenceEarned: number
  damageDealt: number
  damageTaken: number
  bestStreak: number
  streak: number
}

/** Итоговые характеристики цитадели после всех модулей, доктрин и технологий. */
export interface DerivedStats {
  level: number
  xpInLevel: number
  xpForLevel: number
  attack: number
  defense: number
  pierce: number
  maxIntegrity: number
  maxEnergy: number
  regen: number
  maskingGain: number
  suppression: number
  plasmaYield: number
  clotYield: number
  essenceYield: number
  xpYield: number
  /** Доход за цикл с учётом всех бонусов. */
  income: { plasma: number; clots: number; essence: number }
  /** Прирост угрозы за цикл. */
  threatGain: number
}
