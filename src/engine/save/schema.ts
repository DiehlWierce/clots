import { BALANCE } from '../balance'
import {
  ACHIEVEMENT_BY_ID,
  DOCTRINE_BY_ID,
  EPOCH_MODIFIER_BY_ID,
  EVENT_BY_ID,
  MUTATION_BY_ID,
  MODULE_BY_ID,
  REGIONS,
  SECTOR_BY_ID,
  TECH_BY_ID,
  getEnemy,
} from '../content'
import { VAULT_ENERGY, VAULT_INTEGRITY } from '../selectors'
import { pruneLore } from '../systems/lore'
import { STATE_VERSION, createInitialState } from '../state'
import type { CombatState, DoctrinePath, GameState, LevelMap, Phase, RegionId } from '../types'

/**
 * Валидация и очистка загружаемого состояния.
 *
 * Правило: любой сейв — недоверенные данные, даже собственный. Всё, что не
 * прошло проверку, заменяется значением по умолчанию, а не роняет игру и не
 * попадает в состояние как NaN. Именно на этом ломалась прошлая версия.
 */

// Ключи, а не массив: Record<Phase, true> заставляет TypeScript ругаться,
// если в игре появится новая фаза, а здесь её забудут. Раньше список был
// массивом, из него выпала фаза 'event' — и каждое случайное событие
// пропадало при перезагрузке страницы.
const PHASE_SET: Record<Phase, true> = {
  mutation: true,
  command: true,
  combat: true,
  vault: true,
  event: true,
  collapsed: true,
  victory: true,
}
const PHASES: readonly Phase[] = Object.keys(PHASE_SET) as Phase[]
const PATHS: readonly DoctrinePath[] = ['reaver', 'warden', 'weaver']
const REGION_IDS: readonly RegionId[] = REGIONS.map(r => r.id)

function num(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed * 10) / 10))
}

function int(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.round(num(value, fallback, min, max))
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Оставляет только известные id и корректные уровни в пределах maxLevel. */
function levelMap(
  value: unknown,
  known: ReadonlyMap<string, { maxLevel: number }>,
  extraKeys: Record<string, number> = {},
): LevelMap {
  const result: LevelMap = {}
  if (typeof value !== 'object' || value === null) return result
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const cap = extraKeys[id] ?? known.get(id)?.maxLevel
    if (cap === undefined) continue
    const level = int(raw, 0, 0, cap)
    if (level > 0) result[id] = level
  }
  return result
}

function idList(value: unknown, known: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item === 'string' && known.has(item)) seen.add(item)
  }
  return [...seen]
}

const SECTOR_IDS = new Set(SECTOR_BY_ID.keys())

/**
 * Превращает произвольные данные в валидное состояние.
 * Возвращает null, только если это вообще не похоже на сейв.
 */
export function sanitizeState(input: unknown): GameState | null {
  if (typeof input !== 'object' || input === null) return null
  const raw = input as Record<string, unknown>
  if (typeof raw.version !== 'number') return null

  const base = createInitialState(int(raw.seed, 1, 0, 0xffffffff))

  const controlled = idList(raw.controlled, SECTOR_IDS)
  // Стартовый сектор нельзя потерять: без него карта становится недостижимой.
  if (!controlled.includes('cap-core')) controlled.unshift('cap-core')

  const achievements: LevelMap = {}
  if (typeof raw.achievements === 'object' && raw.achievements !== null) {
    for (const [id, value] of Object.entries(raw.achievements as Record<string, unknown>)) {
      const def = ACHIEVEMENT_BY_ID.get(id)
      if (!def) continue
      achievements[id] = int(value, 0, 0, def.target ?? 1)
    }
  }

  const state: GameState = {
    ...base,
    version: STATE_VERSION,
    seed: int(raw.seed, base.seed, 0, 0xffffffff),
    rngCursor: int(raw.rngCursor, 0, 0),

    cycle: int(raw.cycle, 1, 1),
    phase: PHASES.includes(raw.phase as Phase) ? (raw.phase as Phase) : 'command',

    plasma: int(raw.plasma, base.plasma),
    clots: int(raw.clots, base.clots),
    essence: int(raw.essence, base.essence),
    energy: int(raw.energy, base.energy, 0, 99),
    integrity: int(raw.integrity, base.integrity, 0),
    threat: num(raw.threat, base.threat, BALANCE.threat.min, BALANCE.threat.max),
    masking: num(raw.masking, base.masking, 0, BALANCE.masking.max),
    xp: int(raw.xp, 0),

    modules: levelMap(raw.modules, MODULE_BY_ID, {
      [VAULT_INTEGRITY]: 10_000,
      [VAULT_ENERGY]: 20,
    }),
    doctrines: levelMap(raw.doctrines, DOCTRINE_BY_ID),
    techs: levelMap(raw.techs, TECH_BY_ID),
    doctrinePath: PATHS.includes(raw.doctrinePath as DoctrinePath)
      ? (raw.doctrinePath as DoctrinePath)
      : null,

    controlled,
    revealed: idList(raw.revealed, SECTOR_IDS).filter(id => !controlled.includes(id)),
    regions: (() => {
      const list = idList(raw.regions, new Set(REGION_IDS)) as RegionId[]
      return list.includes('capillary') ? list : ['capillary', ...list]
    })(),
    selectedSector:
      typeof raw.selectedSector === 'string' && SECTOR_IDS.has(raw.selectedSector)
        ? raw.selectedSector
        : null,

    mutation:
      typeof raw.mutation === 'string' && MUTATION_BY_ID.has(raw.mutation) ? raw.mutation : null,
    mutationOffer: idList(raw.mutationOffer, new Set(MUTATION_BY_ID.keys())),

    pendingEvent:
      typeof raw.pendingEvent === 'string' && EVENT_BY_ID.has(raw.pendingEvent)
        ? raw.pendingEvent
        : null,
    lastEventCycle: int(raw.lastEventCycle, 0, 0),
    seenEvents: idList(raw.seenEvents, new Set(EVENT_BY_ID.keys())),

    siegeCyclesLeft: int(raw.siegeCyclesLeft, 0, 0, 999),
    ngPlus: int(raw.ngPlus, 0, 0, 999),

    epoch: int(raw.epoch, 0, 0, 999),
    epochModifiers: idList(raw.epochModifiers, new Set(EPOCH_MODIFIER_BY_ID.keys())),

    combat: null,
    pendingVault:
      typeof raw.pendingVault === 'string' && SECTOR_IDS.has(raw.pendingVault)
        ? raw.pendingVault
        : null,

    achievements,
    log: sanitizeLog(raw.log),
    // Список глав приводится в соответствие с правилами ниже, после того
    // как остальное состояние собрано: условия зависят от него.
    lore: Array.isArray(raw.lore) ? raw.lore.filter((x): x is string => typeof x === 'string') : [],

    tutorialStep: int(raw.tutorialStep, 0, 0, 99),
    tutorialDismissed: bool(raw.tutorialDismissed, false),

    stats: sanitizeStats(raw.stats, base.stats),
  }

  // Бой восстанавливаем, только если он полностью валиден: недобитый бой из
  // повреждённого сейва — прямой путь к зависшему оверлею.
  state.combat = sanitizeCombat(raw.combat)
  if (state.combat === null && state.phase === 'combat') state.phase = 'command'
  if (state.pendingVault === null && state.phase === 'vault') state.phase = 'command'
  // Фаза выбора мутации без вариантов заперла бы игру на пустом экране.
  if (state.phase === 'mutation' && state.mutationOffer.length === 0) state.phase = 'command'
  // Фаза события без самого события заперла бы игру на пустом оверлее.
  if (state.phase === 'event' && state.pendingEvent === null) state.phase = 'command'
  // И наоборот: событие без своей фазы — мусор из старого сейва. Оставить его
  // значит держать в состоянии ссылку, которую уже никто не покажет.
  if (state.phase !== 'event') state.pendingEvent = null
  if (state.mutation !== null && state.phase === 'mutation') state.phase = 'command'
  if (state.integrity <= 0) {
    state.phase = 'collapsed'
    state.combat = null
  }

  // Самолечение: глава, открытая по ошибке в прошлой версии игры, хранится
  // в сейве и иначе осталась бы навсегда. Список пересобирается по правилам.
  state.lore = pruneLore(state)

  return state
}

function sanitizeCombat(value: unknown): GameState['combat'] {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  const enemyId = typeof raw.enemyId === 'string' ? raw.enemyId : ''
  if (!getEnemy(enemyId)) return null
  const maxHp = int(raw.maxHp, 0, 1)
  const hp = int(raw.hp, maxHp, 1, maxHp)
  const sectorId = typeof raw.sectorId === 'string' ? raw.sectorId : '__raid__'
  if (sectorId !== '__raid__' && !SECTOR_IDS.has(sectorId)) return null
  return {
    sectorId,
    enemyId,
    hp,
    maxHp,
    attack: num(raw.attack, 1, 0),
    armor: int(raw.armor, 0, 0),
    armorBroken: int(raw.armorBroken, 0, 0),
    shield: int(raw.shield, 0, 0),
    intentIndex: int(raw.intentIndex, 0, 0, 999),
    focused: bool(raw.focused, false),
    guarded: bool(raw.guarded, false),
    momentum: int(raw.momentum, 0, 0, BALANCE.combat.momentum.max),
    statuses: sanitizeStatuses(raw.statuses),
    round: int(raw.round, 1, 1),
    forced: bool(raw.forced, false),
  }
}

function sanitizeStatuses(value: unknown): CombatState['statuses'] {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  return {
    bleed: int(raw.bleed, 0, 0, 99),
    corrode: int(raw.corrode, 0, 0, 999),
    stun: int(raw.stun, 0, 0, 9),
  }
}

function sanitizeLog(value: unknown): GameState['log'] {
  if (!Array.isArray(value)) return []
  const tones = new Set(['info', 'good', 'bad'])
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .slice(-BALANCE.log.limit)
    .map((item, index) => ({
      id: index + 1,
      cycle: int(item.cycle, 1, 1),
      message: typeof item.message === 'string' ? item.message.slice(0, 300) : '',
      tone: (tones.has(item.tone as string) ? item.tone : 'info') as 'info' | 'good' | 'bad',
    }))
    .filter(entry => entry.message.length > 0)
}

function sanitizeStats(value: unknown, fallback: GameState['stats']): GameState['stats'] {
  if (typeof value !== 'object' || value === null) return fallback
  const raw = value as Record<string, unknown>
  return {
    battlesWon: int(raw.battlesWon, 0),
    battlesLost: int(raw.battlesLost, 0),
    sectorsTaken: int(raw.sectorsTaken, 0),
    sectorsLost: int(raw.sectorsLost, 0),
    raidsSurvived: int(raw.raidsSurvived, 0),
    plasmaEarned: int(raw.plasmaEarned, 0),
    clotsEarned: int(raw.clotsEarned, 0),
    essenceEarned: int(raw.essenceEarned, 0),
    damageDealt: int(raw.damageDealt, 0),
    damageTaken: int(raw.damageTaken, 0),
    bestStreak: int(raw.bestStreak, 0),
    streak: int(raw.streak, 0),
  }
}
