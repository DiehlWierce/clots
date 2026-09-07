import { BALANCE, levelForXp, xpForNextLevel } from './balance'
import {
  ACHIEVEMENT_BY_ID,
  DOCTRINE_BY_ID,
  MUTATION_BY_ID,
  MODULE_BY_ID,
  SECTORS,
  TECH_BY_ID,
  getSector,
  neighborsOf,
} from './content'
import type { CitadelEffects, DerivedStats, GameState, ResourceBag, SectorDef } from './types'

const EFFECT_KEYS = [
  'attack',
  'defense',
  'maxIntegrity',
  'maxEnergy',
  'masking',
  'plasmaYield',
  'clotYield',
  'essenceYield',
  'suppression',
  'xpYield',
  'pierce',
  'regen',
] as const satisfies ReadonlyArray<keyof CitadelEffects>

/** Служебные ключи трофеев из хранилищ (не настоящие модули). */
export const VAULT_INTEGRITY = '__vault-integrity'
export const VAULT_ENERGY = '__vault-energy'

type EffectTotals = Required<CitadelEffects>

function emptyEffects(): EffectTotals {
  return {
    attack: 0,
    defense: 0,
    maxIntegrity: 0,
    maxEnergy: 0,
    masking: 0,
    plasmaYield: 0,
    clotYield: 0,
    essenceYield: 0,
    suppression: 0,
    xpYield: 0,
    pierce: 0,
    regen: 0,
  }
}

function addScaled(total: EffectTotals, effects: CitadelEffects, level: number): void {
  for (const key of EFFECT_KEYS) {
    const value = effects[key]
    if (value !== undefined) total[key] += value * level
  }
}

/** Суммарные эффекты всех модулей, доктрин, технологий и уровня цитадели. */
export function collectEffects(state: GameState): EffectTotals {
  const total = emptyEffects()

  for (const [id, level] of Object.entries(state.modules)) {
    if (level <= 0) continue
    // Трофеи из хранилищ хранятся в той же карте под служебными ключами,
    // чтобы попадать в сейв и в расчёт характеристик без отдельной ветки данных.
    if (id === VAULT_INTEGRITY) {
      total.maxIntegrity += level
      continue
    }
    if (id === VAULT_ENERGY) {
      total.maxEnergy += level
      continue
    }
    const def = MODULE_BY_ID.get(id)
    if (def) addScaled(total, def.effects, level)
  }
  for (const [id, level] of Object.entries(state.doctrines)) {
    const def = DOCTRINE_BY_ID.get(id)
    if (def && level > 0) addScaled(total, def.effects, level)
  }
  for (const [id, level] of Object.entries(state.techs)) {
    const def = TECH_BY_ID.get(id)
    if (def && level > 0) addScaled(total, def.effects, level)
  }

  // Бонусы от захваченных секторов.
  for (const sectorId of state.controlled) {
    const sector = getSector(sectorId)
    if (!sector?.income) continue
    if (sector.income.defense) total.defense += sector.income.defense
    if (sector.income.integrity) total.maxIntegrity += sector.income.integrity
    if (sector.income.energy) total.maxEnergy += sector.income.energy
    if (sector.income.suppression) total.suppression += sector.income.suppression
  }

  // Стартовая мутация действует всю партию наравне с модулями.
  if (state.mutation) {
    const mutation = MUTATION_BY_ID.get(state.mutation)
    if (mutation) addScaled(total, mutation.effects, 1)
  }

  // Бонусы за уровень цитадели.
  const level = levelForXp(state.xp)
  const stage = level - 1
  const per = BALANCE.progression.perLevel
  total.attack += stage * per.attack
  total.defense += stage * per.defense
  total.maxIntegrity += stage * per.maxIntegrity
  total.masking += stage * per.masking

  return total
}

/** Сырой доход с секторов до множителей. */
export function baseIncome(state: GameState): { plasma: number; clots: number; essence: number } {
  const base = BALANCE.citadel.baseIncome
  let plasma = base.plasma
  let clots: number = base.clots
  let essence: number = base.essence

  for (const sectorId of state.controlled) {
    const income = getSector(sectorId)?.income
    if (!income) continue
    plasma += income.plasma ?? 0
    clots += income.clots ?? 0
    essence += income.essence ?? 0
  }
  return { plasma, clots, essence }
}

/** Суммарный «шум» от захваченных секторов — основной драйвер угрозы. */
export function territoryHeat(state: GameState): number {
  let heat = 0
  for (const sectorId of state.controlled) heat += getSector(sectorId)?.heat ?? 0
  return heat * mutationHeatMultiplier(state)
}

/** Множитель шума от стартовой мутации. */
export function mutationHeatMultiplier(state: GameState): number {
  if (!state.mutation) return 1
  return MUTATION_BY_ID.get(state.mutation)?.heatMultiplier ?? 1
}

/** Множитель силы рейдов от стартовой мутации. */
export function mutationRaidPower(state: GameState): number {
  if (!state.mutation) return 1
  return MUTATION_BY_ID.get(state.mutation)?.raidPower ?? 1
}

/**
 * Прирост угрозы за цикл.
 *
 * Ключевое отличие от прошлой версии: снижение — мультипликативное и
 * ограничено сверху (maskingCap), поэтому прирост никогда не становится
 * нулевым или отрицательным. Расширение всегда остаётся риском.
 */
export function threatGain(state: GameState, effects = collectEffects(state)): number {
  const t = BALANCE.threat
  const raw = t.base + territoryHeat(state)
  const fromMasking = Math.min(t.maskingCap, state.masking / t.maskingDivisor)
  const fromUpgrades = Math.min(t.maskingCap, Math.max(0, effects.suppression))
  const reduction = Math.min(t.maskingCap, fromMasking + fromUpgrades)
  return round2(raw * (1 - reduction))
}

export function derive(state: GameState): DerivedStats {
  const effects = collectEffects(state)
  const level = levelForXp(state.xp)
  const curve = BALANCE.progression.xpCurve
  const currentThreshold = curve[level - 1] ?? 0
  const nextThreshold = xpForNextLevel(level)
  const income = baseIncome(state)

  return {
    level,
    xpInLevel: state.xp - currentThreshold,
    xpForLevel: nextThreshold === null ? 0 : nextThreshold - currentThreshold,
    attack: Math.round(BALANCE.citadel.baseAttack + effects.attack),
    defense: Math.round(BALANCE.citadel.baseDefense + effects.defense),
    pierce: Math.round(effects.pierce),
    maxIntegrity: Math.round(BALANCE.citadel.baseMaxIntegrity + effects.maxIntegrity),
    maxEnergy: Math.round(BALANCE.citadel.baseMaxEnergy + effects.maxEnergy),
    regen: Math.round(BALANCE.citadel.baseRegen + effects.regen),
    maskingGain: round2(effects.masking),
    suppression: round2(effects.suppression),
    plasmaYield: round2(effects.plasmaYield),
    clotYield: round2(effects.clotYield),
    essenceYield: round2(effects.essenceYield),
    xpYield: round2(effects.xpYield),
    income: {
      plasma: Math.round(income.plasma * (1 + effects.plasmaYield)),
      clots: Math.round(income.clots * (1 + effects.clotYield)),
      essence: Math.round(income.essence * (1 + effects.essenceYield)),
    },
    threatGain: threatGain(state, effects),
  }
}

// ─── Доступность действий ───────────────────────────────────────────────────

export function canAfford(state: GameState, cost: ResourceBag): boolean {
  return (
    state.plasma >= (cost.plasma ?? 0) &&
    state.clots >= (cost.clots ?? 0) &&
    state.essence >= (cost.essence ?? 0)
  )
}

/** Стоимость следующего уровня; undefined — максимум достигнут. */
export function nextCost(
  costs: readonly ResourceBag[],
  currentLevel: number,
): ResourceBag | undefined {
  return costs[currentLevel]
}

/**
 * Получено ли достижение.
 *
 * В state.achievements лежит ПРОГРЕСС, а не флаг: у накопительных достижений
 * это текущее значение счётчика. Поэтому «есть запись» и «достижение получено» —
 * разные вещи, и правило обязано жить в одном месте: иначе, например, лор
 * открывался на старте, приняв прогресс «1 сектор из 10» за выполнение.
 */
export function isAchievementEarned(state: GameState, id: string): boolean {
  const value = state.achievements[id] ?? 0
  if (value <= 0) return false
  const target = ACHIEVEMENT_BY_ID.get(id)?.target
  return target === undefined ? true : value >= target
}

export function moduleLevel(state: GameState, id: string): number {
  return state.modules[id] ?? 0
}
export function doctrineLevel(state: GameState, id: string): number {
  return state.doctrines[id] ?? 0
}
export function techLevel(state: GameState, id: string): number {
  return state.techs[id] ?? 0
}

export function requirementsMet(
  levels: Record<string, number>,
  requires?: readonly string[],
): boolean {
  if (!requires?.length) return true
  return requires.every(id => (levels[id] ?? 0) > 0)
}

/** Сектор доступен для захвата, если он разведан и граничит с уже захваченным. */
export function isSectorReachable(state: GameState, sectorId: string): boolean {
  if (state.controlled.includes(sectorId)) return false
  const sector = getSector(sectorId)
  if (!sector) return false
  if (!state.regions.includes(sector.region)) return false
  return neighborsOf(sectorId).some(n => state.controlled.includes(n))
}

/** Секторы, которые игрок видит на карте: захваченные + разведанные соседи. */
export function visibleSectors(state: GameState): SectorDef[] {
  const visible = new Set<string>([...state.controlled, ...state.revealed])
  return SECTORS.filter(s => visible.has(s.id) && state.regions.includes(s.region))
}

export function sectorsInRegion(state: GameState, region: string): SectorDef[] {
  return SECTORS.filter(s => s.region === region && state.controlled.includes(s.id))
}

export function isRegionCleared(state: GameState, region: string): boolean {
  const all = SECTORS.filter(s => s.region === region)
  return all.every(s => state.controlled.includes(s.id))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
