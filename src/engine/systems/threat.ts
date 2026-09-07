import { BALANCE } from '../balance'
import { RAID_TABLE, getEnemy, getSector, neighborsOf } from '../content'
import type { Rng } from '../rng'
import type { EnemyDef, GameState } from '../types'

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
 * Сложность рейда: доля от силы империи, заданная текущей угрозой.
 *
 * Было `min(угроза/10, уровень)` — то есть не выше десяти при сложности
 * секторов до семнадцати. Рейд физически не мог стать опасным, и стиль,
 * который вовсе не сбивал угрозу, выигрывал 50 забегов из 50 без единой
 * гибели. Теперь рейд растёт вместе с игроком — и по уровню, и по размеру
 * империи: на пределе угрозы он тяжелее того, что игрок берёт по своему
 * выбору, а у порога рейдов заметно легче.
 */
export function raidDifficulty(threat: number, level: number, sectors: number): number {
  const t = BALANCE.threat
  const share = Math.max(0, Math.min(1, threat / t.max))
  const power = level + t.raidLevelMargin + sectors / t.raidSectorsPerStep
  return Math.max(1, Math.round(share * power))
}

/** Шанс потерять сектор за цикл. Работает выше собственного порога. */
export function reclaimChance(threat: number): number {
  const t = BALANCE.threat
  if (threat < t.reclaimThreshold) return 0
  const span = t.max - t.reclaimThreshold
  if (span <= 0) return t.reclaimChanceAtMax
  const progress = (threat - t.reclaimThreshold) / span
  return t.reclaimChanceAtThreshold + progress * (t.reclaimChanceAtMax - t.reclaimChanceAtThreshold)
}

/**
 * Какой сектор отобьёт иммунитет.
 *
 * Берётся периферия — сектор с наименьшим числом своих соседей: именно окраины
 * держать труднее всего. При равенстве предпочитается более шумный, то есть
 * тот, который империи и так дорого обходится. Стартовый сектор неприкосновенен,
 * иначе карта могла бы стать недостижимой.
 */
export function pickReclaimTarget(state: GameState, rng: Rng): string | null {
  const owned = new Set(state.controlled)
  const candidates = state.controlled.filter(id => !BALANCE.threat.protectedSectors.includes(id))
  if (candidates.length === 0) return null

  const scored = candidates.map(id => ({
    id,
    support: neighborsOf(id).filter(n => owned.has(n)).length,
    heat: getSector(id)?.heat ?? 0,
  }))

  const minSupport = Math.min(...scored.map(s => s.support))
  const weakest = scored.filter(s => s.support === minSupport)
  const maxHeat = Math.max(...weakest.map(s => s.heat))
  const loudest = weakest.filter(s => s.heat === maxHeat)

  return rng.pick(loudest).id
}
