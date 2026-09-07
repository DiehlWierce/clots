import { BALANCE } from '../balance'
import {
  DOCTRINES as DOCTRINE_ORDER,
  EVENT_BY_ID,
  MODULES,
  SECTORS,
  TECHS,
  getSector,
} from '../content'
import { reduce } from '../engine'
import {
  canAfford,
  derive,
  doctrineForkBlocked,
  isSectorReachable,
  nextCost,
  requirementsMet,
} from '../selectors'
import { currentIntent, momentumCost } from '../systems/combat'
import type { GameAction } from '../actions'
import type { DoctrinePath, GameState } from '../types'

/**
 * Политики игры для симуляции.
 *
 * Балансировка была занятием на глаз: любая правка чисел проверялась
 * ощущениями. Здесь описаны три разных стиля игры, чтобы измерять, а не
 * угадывать: что происходит с агрессивным, экономическим и осторожным
 * подходом на одних и тех же зёрнах.
 */

export type PolicyId = 'aggressive' | 'economic' | 'cautious'

export interface Policy {
  id: PolicyId
  name: string
  /** Порог угрозы, выше которого политика перестаёт расширяться. */
  expandBelowThreat: number
  /** Доля целостности, ниже которой политика не идёт в штурм. */
  assaultAboveHealth: number
  /** Доля целостности, до которой политика лечится. */
  healUpTo: number
  /** Предпочитаемый путь доктрин. */
  path: DoctrinePath
  /** Доля энергии, отдаваемая на переработку вместо добычи. */
  refineBias: number
}

export const POLICIES: Record<PolicyId, Policy> = {
  aggressive: {
    id: 'aggressive',
    name: 'Агрессивная',
    expandBelowThreat: 85,
    assaultAboveHealth: 0.5,
    healUpTo: 0.6,
    path: 'reaver',
    refineBias: 0.3,
  },
  economic: {
    id: 'economic',
    name: 'Экономическая',
    expandBelowThreat: 65,
    assaultAboveHealth: 0.8,
    healUpTo: 0.85,
    path: 'weaver',
    refineBias: 0.7,
  },
  cautious: {
    id: 'cautious',
    name: 'Осторожная',
    expandBelowThreat: 50,
    assaultAboveHealth: 0.9,
    healUpTo: 0.95,
    path: 'warden',
    refineBias: 0.5,
  },
}

const act = (state: GameState, action: GameAction): GameState => reduce(state, action).state

/**
 * Детерминированный «бросок» политики: зависит только от состояния партии,
 * поэтому один и тот же забег всегда воспроизводится по зерну.
 */
function decide(state: GameState, probability: number): boolean {
  const hash = (state.seed ^ (state.cycle * 2654435761) ^ (state.energy * 40503)) >>> 0
  return (hash % 1000) / 1000 < probability
}

/** Один ход бота: разрешает всё, что прерывает цикл, и делает один шаг. */
export function step(state: GameState, policy: Policy): GameState {
  const s = state

  if (s.phase === 'mutation') {
    const pick = s.mutationOffer[0]
    return pick ? act(s, { type: 'mutation/choose', id: pick }) : s
  }

  if (s.phase === 'combat' && s.combat) {
    return fightStep(s, policy)
  }

  if (s.phase === 'event' && s.pendingEvent) {
    const event = EVENT_BY_ID.get(s.pendingEvent)
    const option =
      event?.options.find(o => !o.requires || canAfford(s, o.requires)) ?? event?.options[0]
    return option ? act(s, { type: 'event/choose', optionId: option.id }) : s
  }

  if (s.phase === 'vault' && s.pendingVault) {
    const option = getSector(s.pendingVault)?.cache?.[0]
    return option ? act(s, { type: 'vault/choose', optionId: option.id }) : s
  }

  if (s.phase !== 'command') return s

  const stats = derive(s)

  // Угроза под контролем — иначе рейды и потеря секторов съедают партию.
  if (s.threat > policy.expandBelowThreat && s.energy >= 1) {
    return s.plasma >= BALANCE.masking.actionCost.plasma
      ? act(s, { type: 'action/mask' })
      : act(s, { type: 'action/scan' })
  }

  // Лечение до порога политики.
  if (
    s.integrity < stats.maxIntegrity * policy.healUpTo &&
    s.energy >= BALANCE.actions.mend.energy &&
    s.plasma >= BALANCE.actions.mend.cost.plasma
  ) {
    return act(s, { type: 'action/mend' })
  }

  // Развитие: технологии, модули, доктрины выбранного пути.
  const purchase = pickPurchase(s, policy)
  if (purchase) return act(s, purchase)

  // Расширение.
  const healthy = s.integrity > stats.maxIntegrity * policy.assaultAboveHealth
  const target = SECTORS.find(sec => isSectorReachable(s, sec.id) && (healthy || !sec.garrison))
  if (target && s.energy >= BALANCE.actions.assault.energy) {
    return act(s, { type: 'map/capture', sectorId: target.id })
  }

  // Экономика: доля энергии на переработку, остальное на добычу.
  if (s.energy >= 1) {
    const wantRefine = s.plasma > BALANCE.actions.refine.cost.plasma * 3
    // Выбор между переработкой и добычей обязан быть детерминированным:
    // Math.random здесь ломал воспроизводимость симуляции по зерну.
    if (wantRefine && decide(s, policy.refineBias)) {
      return act(s, { type: 'action/refine' })
    }
    if (s.clots > BALANCE.actions.transmute.cost.clots * 3 && s.energy >= 2) {
      return act(s, { type: 'action/transmute' })
    }
    return act(s, { type: 'action/harvest' })
  }

  return act(s, { type: 'cycle/end' })
}

function pickPurchase(s: GameState, policy: Policy): GameAction | null {
  for (const def of TECHS) {
    const level = s.techs[def.id] ?? 0
    if (level >= def.maxLevel) continue
    if (!requirementsMet(s.techs, def.requires)) continue
    const cost = nextCost(def.costs, level)
    if (cost && canAfford(s, cost)) return { type: 'tech/buy', id: def.id }
  }
  for (const def of MODULES) {
    const level = s.modules[def.id] ?? 0
    if (level >= def.maxLevel) continue
    if (!requirementsMet(s.modules, def.requires)) continue
    const cost = nextCost(def.costs, level)
    if (cost && canAfford(s, cost)) return { type: 'module/buy', id: def.id }
  }
  for (const def of DOCTRINE_ORDER) {
    if (def.path !== policy.path) continue
    if (s.doctrinePath !== null && s.doctrinePath !== def.path) continue
    if (doctrineForkBlocked(s, def)) continue
    const level = s.doctrines[def.id] ?? 0
    if (level >= def.maxLevel) continue
    if (!requirementsMet(s.doctrines, def.requires, def.requiresAny)) continue
    const cost = nextCost(def.costs, level)
    if (cost && canAfford(s, cost)) return { type: 'doctrine/buy', id: def.id }
  }
  return null
}

function fightStep(s: GameState, policy: Policy): GameState {
  const combat = s.combat
  if (!combat) return s
  const stats = derive(s)
  const intent = currentIntent(combat).kind
  const needsRupture = combat.shield > 0 || combat.armor - combat.armorBroken > 8

  if (needsRupture && combat.momentum >= momentumCost('rupture')) {
    return act(s, { type: 'combat/act', action: 'rupture' })
  }
  // Осторожная политика чаще уходит в защиту.
  const guardThreshold = policy.id === 'cautious' ? 0.7 : 0.4
  if (intent === 'heavy' && s.integrity < stats.maxIntegrity * guardThreshold) {
    return act(s, { type: 'combat/act', action: 'guard' })
  }
  if (
    combat.momentum >= momentumCost('surge') &&
    s.clots >= BALANCE.combat.surge.cost.clots &&
    !needsRupture
  ) {
    return act(s, { type: 'combat/act', action: 'surge' })
  }
  return act(s, { type: 'combat/act', action: 'strike' })
}
