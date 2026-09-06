import { BALANCE } from '../balance'
import { RAID_TABLE, getEnemy } from '../content'
import type { Rng } from '../rng'
import type { EnemyDef } from '../types'

export function clampThreat(value: number): number {
  const { min, max } = BALANCE.threat
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Шанс рейда за цикл. Ниже порога — ноль; выше растёт линейно до максимума.
 * Это единственный источник рейдов, поэтому кривая читается целиком здесь.
 */
export function raidChance(threat: number): number {
  const t = BALANCE.threat
  if (threat < t.raidThreshold) return 0
  const span = t.max - t.raidThreshold
  if (span <= 0) return t.raidChanceAtMax
  const progress = (threat - t.raidThreshold) / span
  return t.raidChanceAtThreshold + progress * (t.raidChanceAtMax - t.raidChanceAtThreshold)
}

/**
 * Выбирает противника для рейда.
 *
 * Уровень рейда ограничен не только угрозой, но и прогрессом игрока
 * (числом открытых регионов): иначе игрок первого региона получал бы
 * противника из третьего и терял партию без шанса что-либо сделать.
 */
export function pickRaider(threat: number, regionsUnlocked: number, rng: Rng): EnemyDef | null {
  const byThreat = RAID_TABLE.filter(tier => threat >= tier.minThreat).length - 1
  const index = Math.max(0, Math.min(byThreat, regionsUnlocked - 1))
  const tier = RAID_TABLE[index]
  if (!tier || tier.enemies.length === 0) return null
  return getEnemy(rng.pick(tier.enemies)) ?? null
}

/**
 * Сложность рейда: растёт с угрозой, но не отрывается от силы цитадели —
 * рейд должен быть наказанием за беспечность, а не приговором.
 */
export function raidDifficulty(threat: number, level: number): number {
  const fromThreat = Math.round(threat / 10)
  // Потолок — уровень цитадели: рейд навязан, поэтому он обязан быть слабее
  // гарнизона той же ступени, который игрок атакует по своему выбору.
  return Math.max(1, Math.min(fromThreat, level))
}
