import { describe, expect, it } from 'vitest'
import { reduce } from '@/engine/engine'
import { createInitialState } from '@/engine/state'
import { derive, isSectorReachable, nextCost, canAfford, requirementsMet } from '@/engine/selectors'
import { MODULES, SECTORS, TECHS, getSector } from '@/engine/content'
import { BALANCE } from '@/engine/balance'
import { currentIntent } from '@/engine/systems/combat'
import type { GameState } from '@/engine/types'

/**
 * Простой бот, играющий «жадно»: качается, расширяется и дерётся.
 * Он не должен играть хорошо — он должен доказывать, что игра проходима
 * и при этом не выигрывается сама собой.
 */
function playout(seed: number, cycles: number): GameState {
  let s = createInitialState(seed)

  const act = (action: Parameters<typeof reduce>[1]) => {
    s = reduce(s, action).state
  }

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    // Сначала лечимся, если просели: раненым в бой лезть нельзя.
    let guard = 0
    let stallHp = Infinity
    let stall = 0
    while (s.phase === 'combat' && guard < 200) {
      guard += 1
      const hpNow = s.combat?.hp ?? 0
      stall = hpNow >= stallHp ? stall + 1 : 0
      stallHp = hpNow
      // Безнадёжный бой — отступаем, как поступил бы живой игрок.
      if (stall > 6 && !s.combat?.forced) {
        act({ type: 'combat/withdraw' })
        break
      }
      const combat = s.combat
      if (!combat) break
      if (s.energy < 1) {
        act({ type: 'combat/withdraw' })
        break
      }
      const intent = currentIntent(combat).kind
      if (combat.shield > 0 || combat.armor - combat.armorBroken > 8)
        act({ type: 'combat/act', action: 'rupture' })
      else if (intent === 'heavy' && s.integrity < derive(s).maxIntegrity * 0.5)
        act({ type: 'combat/act', action: 'guard' })
      else if (s.clots >= BALANCE.combat.surge.cost.clots)
        act({ type: 'combat/act', action: 'surge' })
      else act({ type: 'combat/act', action: 'strike' })
    }

    if (s.phase === 'vault' && s.pendingVault) {
      const option = getSector(s.pendingVault)?.cache?.[0]
      if (option) act({ type: 'vault/choose', optionId: option.id })
    }

    if (s.phase === 'collapsed' || s.phase === 'victory') break

    // Держим угрозу под контролем.
    if (s.threat > BALANCE.threat.raidThreshold - 10 && s.energy >= 1) {
      act({ type: 'action/mask' })
    }

    // Чиним ядро, когда просело.
    const stats = derive(s)
    if (s.integrity < stats.maxIntegrity * 0.8 && s.energy >= BALANCE.actions.mend.energy) {
      act({ type: 'action/mend' })
    }

    // Покупаем всё, что по карману.
    for (const def of [...TECHS, ...MODULES]) {
      const levels = TECHS.includes(def as never) ? s.techs : s.modules
      const level = levels[def.id] ?? 0
      if (level >= def.maxLevel) continue
      if (!requirementsMet(levels, def.requires)) continue
      const cost = nextCost(def.costs, level)
      if (!cost || !canAfford(s, cost)) continue
      act(
        TECHS.includes(def as never)
          ? { type: 'tech/buy', id: def.id }
          : { type: 'module/buy', id: def.id },
      )
    }

    // Расширяемся, но в штурм не лезем на низкой целостности.
    if (s.phase === 'command') {
      const healthy = s.integrity > derive(s).maxIntegrity * 0.85
      const target = SECTORS.find(
        sec => isSectorReachable(s, sec.id) && (healthy || !sec.garrison),
      )
      const need = target?.garrison
        ? BALANCE.actions.assault.energy
        : BALANCE.actions.occupy.energy
      if (target && s.energy >= need) act({ type: 'map/capture', sectorId: target.id })
    }

    // Оставшуюся энергию раскладываем по цепочке: излишки плазмы идут в
    // сгустки, излишки сгустков — в эссенцию. Одна добыча экономику не тянет.
    let spins = 0
    while (s.phase === 'command' && s.energy >= 1 && spins < 20) {
      spins += 1
      if (s.clots >= 40 && s.energy >= BALANCE.actions.transmute.energy) {
        act({ type: 'action/transmute' })
      } else if (s.plasma >= 150) {
        act({ type: 'action/refine' })
      } else {
        act({ type: 'action/harvest' })
      }
    }

    if (s.phase === 'command') act({ type: 'cycle/end' })
  }

  return s
}

describe('баланс: игра проходима и не тривиальна', () => {
  it('простой бот за 30 циклов строит работающую империю', () => {
    const s = playout(2024, 30)
    expect(s.controlled.length, 'территория должна расти').toBeGreaterThan(8)
    expect(derive(s).level, 'уровень должен расти').toBeGreaterThan(3)
    expect(s.stats.battlesWon, 'бои должны выигрываться').toBeGreaterThan(4)
    // Экономика обязана компаундиться, а не стоять на базовом доходе.
    expect(derive(s).income.plasma).toBeGreaterThan(40)
  })

  it('открывается второй регион — контент не заперт за непроходимым боссом', () => {
    const s = playout(2024, 30)
    expect(s.regions).toContain('venous')
  })

  it('игра не выигрывается за первые циклы', () => {
    const s = playout(2024, 10)
    expect(s.phase).not.toBe('victory')
    expect(s.controlled.length).toBeLessThan(SECTORS.length)
  })

  it('расширение действительно повышает давление', () => {
    const small = createInitialState(1)
    const big: GameState = {
      ...small,
      controlled: SECTORS.slice(0, 20).map(s => s.id),
    }
    expect(derive(big).threatGain).toBeGreaterThan(derive(small).threatGain)
  })

  it('доход растёт вместе с территорией', () => {
    const small = createInitialState(1)
    const big: GameState = {
      ...small,
      controlled: SECTORS.filter(s => s.income?.plasma).map(s => s.id),
    }
    expect(derive(big).income.plasma).toBeGreaterThan(derive(small).income.plasma * 3)
  })

  it('бездействие не выигрывает: без расширения экономика почти не растёт', () => {
    let idle = createInitialState(9)
    for (let i = 0; i < 40; i += 1) idle = reduce(idle, { type: 'cycle/end' }).state
    const active = playout(9, 40)
    expect(active.xp).toBeGreaterThan(idle.xp * 3)
  })

  it('за несколько партий с разными зёрнами бот ни разу не ломает игру', () => {
    for (const seed of [1, 77, 4242, 999983]) {
      const s = playout(seed, 40)
      expect(Number.isFinite(s.plasma)).toBe(true)
      expect(s.threat).toBeGreaterThanOrEqual(0)
      expect(s.threat).toBeLessThanOrEqual(100)
      expect(s.integrity).toBeGreaterThanOrEqual(0)
      expect(['command', 'combat', 'vault', 'collapsed', 'victory']).toContain(s.phase)
    }
  })
})
