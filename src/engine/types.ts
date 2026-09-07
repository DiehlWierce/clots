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
  /** Радиус узла сети: на сколько шагов ретранслятор тянет полную отдачу. */
  logistics?: number
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
  /**
   * Развилка внутри пути: доктрины с одинаковым fork взаимоисключающие.
   * Выбрав одну, вторую взять уже нельзя — это второе значимое решение
   * партии после выбора самого пути.
   */
  fork?: string
  tier: number
  maxLevel: number
  costs: ResourceBag[]
  effects: CitadelEffects
  requires?: string[]
  /** Достаточно любого из requires, а не всех: используется после развилки. */
  requiresAny?: boolean
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

/** Состояния, наложенные на противника. Значение — сколько ходов осталось. */
export interface EnemyStatuses {
  /** Кровотечение: урон в начале каждого хода врага. */
  bleed: number
  /** Разъедание: постоянное снижение брони, не проходит само. */
  corrode: number
  /** Оглушение: враг пропускает намерение. */
  stun: number
}

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
  /**
   * Импульс — боевой ресурс, накапливаемый ударами и фокусом.
   * До него оптимальной стратегией было жать одну кнопку: фокус и щит
   * почти всегда проигрывали по урону в единицу времени.
   */
  momentum: number
  statuses: EnemyStatuses
  round: number
  /** Бой навязан рейдом: отступление невозможно. */
  forced: boolean
}

// ─── Прочее ─────────────────────────────────────────────────────────────────

/** Один вариант ответа на событие. */
export interface EventOption {
  id: string
  label: string
  /** Что произойдёт — формулируется до выбора, без скрытых последствий. */
  outcome: string
  /** Разовое изменение ресурсов; отрицательные значения — трата. */
  resources?: { plasma?: number; clots?: number; essence?: number }
  integrity?: number
  energy?: number
  threat?: number
  masking?: number
  xp?: number
  /** Требование к ресурсам, без которого вариант недоступен. */
  requires?: ResourceBag
  /** Немедленный бой с этим противником. */
  fight?: string
}

export interface EventDef {
  id: string
  title: string
  text: string
  /** Событие не выпадет раньше этого цикла. */
  minCycle?: number
  /** Событие требует хотя бы столько захваченных секторов. */
  minSectors?: number
  /** Событие выпадает только при угрозе не ниже указанной. */
  minThreat?: number
  options: EventOption[]
}

/**
 * Глобальный модификатор эпохи: правило, которое действует до конца партии.
 * Эпохи синхронизируют лор с механикой — поздние циклы перестают быть
 * повторением ранних с большими числами.
 */
export interface EpochModifierDef {
  id: string
  name: string
  description: string
  effects?: CitadelEffects
  /** Множитель урона в бою — и своего, и вражеского. */
  combatDamage?: number
  /** Множитель прироста угрозы. */
  threatMultiplier?: number
  /** Множитель дохода с секторов. */
  incomeMultiplier?: number
  /** Множитель лечения врагов. */
  enemyRegen?: number
}

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

export type Phase = 'mutation' | 'command' | 'combat' | 'vault' | 'event' | 'collapsed' | 'victory'

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

  /** Событие, ждущее ответа игрока. */
  pendingEvent: string | null
  /** Цикл последнего события — чтобы они не шли подряд. */
  lastEventCycle: number
  /** Уже случившиеся события: одно и то же не повторяется. */
  seenEvents: string[]

  /** Сколько циклов осталось продержаться в осаде. 0 — осады нет. */
  siegeCyclesLeft: number
  /** Номер прохождения: 0 — первый забег, дальше New Game+. */
  ngPlus: number

  /** Номер текущей эпохи (0 — первая). */
  epoch: number
  /** Накопленные модификаторы эпох: действуют до конца партии. */
  epochModifiers: string[]

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
  sectorsLost: number
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
  /** Радиус узлов сети от модулей и технологий. */
  logistics: number
  /** Доля дохода, теряемая на доставке. 0 — потерь нет. */
  logisticsLoss: number
}
