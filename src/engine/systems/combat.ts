import { BALANCE } from '../balance'
import { INTENTS, getEnemy, getSector } from '../content'
import type { Rng } from '../rng'
import type { CombatState, DerivedStats, EnemyDef, IntentDef, PlayerCombatAction } from '../types'

/** Создаёт бой за сектор: сила гарнизона масштабируется сложностью сектора. */
export function createSectorCombat(sectorId: string, rng: Rng, ngPlus = 0): CombatState | null {
  const sector = getSector(sectorId)
  if (!sector?.garrison) return null
  const enemy = getEnemy(sector.garrison)
  if (!enemy) return null
  // Каждое прохождение делает гарнизоны тяжелее: иначе New Game+ был бы
  // повторением уже решённой задачи с готовым заделом технологий.
  const difficulty = sector.difficulty + ngPlus * BALANCE.ngPlus.difficultyPerRun
  return buildCombat(sectorId, enemy, difficulty, false, rng)
}

/** Создаёт навязанный бой с рейдом: отступить нельзя. */
export function createRaidCombat(enemy: EnemyDef, difficulty: number, rng: Rng): CombatState {
  return buildCombat('__raid__', enemy, difficulty, true, rng)
}

function buildCombat(
  sectorId: string,
  enemy: EnemyDef,
  difficulty: number,
  forced: boolean,
  rng: Rng,
): CombatState {
  const c = BALANCE.combat
  const hp = Math.round(enemy.hp + difficulty * c.hpPerDifficulty)
  // Рейд бьёт по ядру напрямую, поэтому его удар тяжелее гарнизонного:
  // без этого пассивная регенерация возвращала больше, чем рейд отнимал.
  const raidPower = forced ? c.raidDamageMultiplier : 1
  const attack =
    Math.round((enemy.attack + difficulty * c.attackPerDifficulty) * raidPower * 10) / 10
  return {
    sectorId,
    enemyId: enemy.id,
    hp,
    maxHp: hp,
    attack,
    armor: enemy.armor,
    armorBroken: 0,
    shield: 0,
    // Стартовое намерение выбирается случайно, чтобы бои с одним и тем же
    // врагом не были копией друг друга.
    intentIndex: rng.int(0, Math.max(0, enemy.pattern.length - 1)),
    focused: false,
    guarded: false,
    momentum: 0,
    statuses: { bleed: 0, corrode: 0, stun: 0 },
    round: 1,
    forced,
  }
}

export function currentIntent(combat: CombatState): IntentDef {
  const enemy = getEnemy(combat.enemyId)
  const fallback = INTENTS.strike
  if (!enemy) return fallback
  const kind = enemy.pattern[combat.intentIndex % enemy.pattern.length]
  return kind ? INTENTS[kind] : fallback
}

export function effectiveArmor(combat: CombatState): number {
  // Разъедание снижает броню постоянно, вскрытие — на этот бой.
  return Math.max(0, combat.armor - combat.armorBroken - combat.statuses.corrode)
}

export interface PlayerHitResult {
  damage: number
  crit: boolean
  weakness: boolean
  /** Сколько урона ушло в щит врага. */
  absorbed: number
}

/** Считает урон игрока по врагу. Чистая функция от (состояние, бросок ГСЧ). */
export function resolvePlayerHit(
  combat: CombatState,
  stats: DerivedStats,
  action: PlayerCombatAction,
  rng: Rng,
  damageScale = 1,
): PlayerHitResult {
  const c = BALANCE.combat
  const enemy = getEnemy(combat.enemyId)

  const power = action === 'surge' ? c.surge.power : action === 'rupture' ? c.rupture.power : 1
  let raw = stats.attack * power

  if (combat.focused) raw *= c.focus.multiplier

  const weakness = enemy?.weakness === action
  if (weakness) raw *= c.weaknessMultiplier

  const critChance = c.critChance + stats.level * c.critPerLevel
  const crit = rng.chance(critChance)
  if (crit) raw *= c.critMultiplier

  raw *= 1 + rng.float(-c.variance, c.variance)
  raw *= damageScale

  // Броня режет урон, пробитие её частично игнорирует.
  const armor = Math.max(0, effectiveArmor(combat) - stats.pierce)
  let damage = Math.max(1, Math.round(raw - armor))

  // Щит врага поглощает урон до здоровья.
  const absorbed = Math.min(combat.shield, damage)
  damage -= absorbed

  return { damage, crit, weakness, absorbed }
}

export interface EnemyTurnResult {
  intent: IntentDef
  /** Враг пропустил ход из-за оглушения. */
  stunned?: boolean
  /** Урон, дошедший до целостности цитадели. */
  damage: number
  energyDrained: number
  healed: number
  shielded: number
  threat: number
}

/** Считает ход врага по его текущему намерению. */
export function resolveEnemyTurn(
  combat: CombatState,
  stats: DerivedStats,
  damageScale = 1,
  regenScale = 1,
): EnemyTurnResult {
  const intent = currentIntent(combat)
  const enemy = getEnemy(combat.enemyId)

  let damage = 0
  if (intent.power > 0) {
    const raw = combat.attack * intent.power
    const defenseApplied = stats.defense * (1 - (intent.ignoreDefense ?? 0))
    damage = Math.max(1, raw - defenseApplied)
    if (combat.guarded) damage *= 1 - BALANCE.combat.guard.reduction
    damage = Math.max(1, Math.round(damage * damageScale))
  }

  // Оглушённый враг пропускает ход целиком.
  if (combat.statuses.stun > 0) {
    return {
      intent,
      damage: 0,
      energyDrained: 0,
      healed: 0,
      shielded: 0,
      threat: 0,
      stunned: true,
    }
  }

  // Лечение врага ограничено долей его максимума за ход: см. enemyHealCap.
  const rawHeal = ((intent.healSelf ?? 0) + (enemy?.regen ?? 0)) * regenScale
  const healed = Math.min(rawHeal, Math.round(combat.maxHp * BALANCE.combat.enemyHealCap))

  return {
    intent,
    damage,
    energyDrained: intent.drainEnergy ?? 0,
    healed,
    shielded: intent.shieldSelf ?? 0,
    threat: intent.threat,
  }
}

/** Урон кровотечения за ход. */
export function bleedDamage(stats: DerivedStats): number {
  return Math.max(1, Math.round(stats.attack * BALANCE.combat.bleedDamage))
}

/** Хватает ли импульса на приём. */
export function momentumCost(action: PlayerCombatAction): number {
  const c = BALANCE.combat
  if (action === 'surge') return c.surge.momentum
  if (action === 'rupture') return c.rupture.momentum
  return 0
}

/** Сколько импульса приносит приём. */
export function momentumGain(action: PlayerCombatAction): number {
  const m = BALANCE.combat.momentum
  switch (action) {
    case 'strike':
      return m.perStrike
    case 'focus':
      return m.perFocus
    case 'guard':
      return m.perGuard
    default:
      return 0
  }
}
