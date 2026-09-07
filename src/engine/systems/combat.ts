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
    // Стартовое намерение выбирается случайно, чтобы бои с одним и тем же
    // врагом не были копией друг друга.
    intentIndex: rng.int(0, Math.max(0, enemy.pattern.length - 1)),
    charging: false,
    enemyCharging: false,
    mended: 0,
    statuses: { bleed: 0 },
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
  return Math.max(0, combat.armor)
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

  const isSuper = action === 'super'
  let raw = stats.attack * (isSuper ? c.super.power : c.strike.power)

  const weakness = enemy?.weakness === action
  if (weakness) raw *= c.weaknessMultiplier

  const critChance = c.critChance + stats.level * c.critPerLevel
  const crit = rng.chance(critChance)
  if (crit) raw *= c.critMultiplier

  raw *= 1 + rng.float(-c.variance, c.variance)
  raw *= damageScale

  // Броня режет урон; супер-удар её пробивает целиком — это его вторая роль
  // помимо силы, и единственный способ обойти броню.
  const armor = isSuper
    ? Math.max(0, effectiveArmor(combat) * (1 - c.super.armorPierce) - stats.pierce)
    : Math.max(0, effectiveArmor(combat) - stats.pierce)
  const damage = Math.max(1, Math.round(raw - armor))

  return { damage, crit, weakness, absorbed: 0 }
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

/**
 * Считает ход врага по его текущему намерению.
 *
 * Противник играет теми же тремя глаголами, что и игрок: бьёт, замахивается
 * или перевязывается. Замах всегда виден за ход вперёд — именно на нём
 * строится решение игрока: ответить своим замахом (и вдвое ослабить удар),
 * добить обычным ударом или уйти.
 */
export function resolveEnemyTurn(
  combat: CombatState,
  stats: DerivedStats,
  damageScale = 1,
  regenScale = 1,
): EnemyTurnResult {
  const intent = currentIntent(combat)
  const enemy = getEnemy(combat.enemyId)
  const c = BALANCE.combat

  // Замах, объявленный в прошлый ход, срабатывает сейчас.
  const power = combat.enemyCharging ? c.enemySuperPower : intent.power

  let damage = 0
  if (power > 0) {
    damage = Math.max(1, combat.attack * power - stats.defense)
    // Игрок в замахе принимает удар вполсилы: замах — это и подготовка,
    // и защита, иначе он повторил бы судьбу «Фокуса».
    if (combat.charging) damage *= 1 - c.charge.mitigation
    damage = Math.max(1, Math.round(damage * damageScale))
  }

  const rawHeal = ((intent.healSelf ?? 0) * combat.maxHp + (enemy?.regen ?? 0)) * regenScale
  const healed = Math.min(rawHeal, Math.round(combat.maxHp * c.enemyHealCap))

  return {
    intent,
    damage,
    energyDrained: 0,
    healed: Math.round(healed),
    shielded: 0,
    threat: intent.threat,
  }
}

/** Урон кровотечения за ход. */
export function bleedDamage(stats: DerivedStats): number {
  return Math.max(1, Math.round(stats.attack * BALANCE.combat.bleedDamage))
}
