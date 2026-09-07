import { describe, expect, it } from 'vitest'
import { reduce } from '@/engine/engine'
import { derive, isSectorReachable, nextCost, canAfford, requirementsMet } from '@/engine/selectors'
import { EVENT_BY_ID, MODULES, SECTORS, TECHS, getSector } from '@/engine/content'
import { BALANCE } from '@/engine/balance'
import type { GameState } from '@/engine/types'
import { simulateRun, summarize } from '@/engine/sim/run'
import { POLICIES, step } from '@/engine/sim/policies'
import { createInitialState } from '@/engine/state'
import { EVENTS } from '@/engine/content/events'
import { newGame } from './helpers'

/**
 * Простой бот, играющий «жадно»: качается, расширяется и дерётся.
 * Он не должен играть хорошо — он должен доказывать, что игра проходима
 * и при этом не выигрывается сама собой.
 */
function playout(seed: number, cycles: number): GameState {
  let s = newGame(seed)

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
      // Бой на трёх глаголах: замахом отвечаем на замах врага, готовый
      // замах тратим сразу, в остальное время бьём.
      if (combat.enemyCharging && !combat.charging) {
        act({ type: 'combat/act', action: 'charge' })
      } else if (combat.charging) {
        act({ type: 'combat/act', action: 'super' })
      } else {
        act({ type: 'combat/act', action: 'strike' })
      }
    }

    if (s.phase === 'vault' && s.pendingVault) {
      const option = getSector(s.pendingVault)?.cache?.[0]
      if (option) act({ type: 'vault/choose', optionId: option.id })
    }

    // События: берём первый вариант, который по карману. Бот не должен
    // застревать на оверлее — иначе все остальные проверки теряют смысл.
    if (s.phase === 'event' && s.pendingEvent) {
      const event = EVENT_BY_ID.get(s.pendingEvent)
      const option =
        event?.options.find(o => !o.requires || canAfford(s, o.requires)) ?? event?.options[0]
      if (option) act({ type: 'event/choose', optionId: option.id })
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
      const target = SECTORS.find(sec => isSectorReachable(s, sec.id) && (healthy || !sec.garrison))
      const need = target?.garrison ? BALANCE.actions.assault.energy : BALANCE.actions.occupy.energy
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
    const small = newGame(1)
    const big: GameState = {
      ...small,
      controlled: SECTORS.slice(0, 20).map(s => s.id),
    }
    expect(derive(big).threatGain).toBeGreaterThan(derive(small).threatGain)
  })

  it('доход растёт вместе с территорией', () => {
    const small = newGame(1)
    const big: GameState = {
      ...small,
      controlled: SECTORS.filter(s => s.income?.plasma).map(s => s.id),
    }
    expect(derive(big).income.plasma).toBeGreaterThan(derive(small).income.plasma * 3)
  })

  it('бездействие не выигрывает: без расширения экономика почти не растёт', () => {
    let idle = newGame(9)
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
      expect(['command', 'combat', 'vault', 'event', 'collapsed', 'victory']).toContain(s.phase)
    }
  })
})

/**
 * Симулятор политик: проверяем сам инструмент, а не конкретные числа
 * баланса — они меняются, а харнесс должен продолжать работать.
 */
describe('балансный харнесс', () => {
  it('забег завершается и возвращает осмысленный результат', () => {
    const result = simulateRun('cautious', 1, 40)
    expect(['victory', 'collapsed', 'timeout']).toContain(result.outcome)
    expect(result.cycles).toBeGreaterThan(1)
    expect(result.sectors).toBeGreaterThanOrEqual(1)
    expect(result.mutation).not.toBeNull()
  })

  it('забег воспроизводим по зерну', () => {
    expect(simulateRun('economic', 42, 30)).toEqual(simulateRun('economic', 42, 30))
  })

  it('разные политики играют по-разному', () => {
    const cautious = simulateRun('cautious', 5, 60)
    const aggressive = simulateRun('aggressive', 5, 60)
    expect(cautious.doctrinePath).not.toBe(aggressive.doctrinePath)
  })

  it('сводка считает доли и медианы', () => {
    const results = [1, 2, 3].map(seed => simulateRun('cautious', seed, 20))
    const summary = summarize(results)
    expect(summary.runs).toBe(3)
    expect(summary.winRate).toBeGreaterThanOrEqual(0)
    expect(summary.winRate).toBeLessThanOrEqual(1)
    expect(summary.medianCycles).toBeGreaterThan(0)
  })

  it('симуляция не зацикливается на неразрешимом состоянии', () => {
    // Ограничение по числу шагов обязано срабатывать: без него любая
    // политика, не умеющая сделать ход, повесила бы прогон.
    const started = Date.now()
    simulateRun('aggressive', 99, 80)
    expect(Date.now() - started).toBeLessThan(5000)
  })
})

describe('события покрывают всю партию', () => {
  /** Наибольший промежуток без событий за прогон и цикл последнего события. */
  function eventCoverage(policy: 'aggressive' | 'cautious', seed: number, cycles: number) {
    let s: GameState = createInitialState(seed)
    let prev = 0
    let worstGap = 0
    let last = 0
    let count = 0
    let guard = 0
    while (s.cycle <= cycles && s.phase !== 'collapsed' && s.phase !== 'victory' && guard < 8000) {
      guard += 1
      const before = s.lastEventCycle
      const next = step(s, POLICIES[policy])
      if (next === s) {
        if (s.phase !== 'command') break
        s = step({ ...s, energy: 0 }, POLICIES[policy])
        continue
      }
      s = next
      if (s.lastEventCycle !== before) {
        worstGap = Math.max(worstGap, s.cycle - prev)
        prev = s.cycle
        last = s.cycle
        count += 1
      }
    }
    return { worstGap: Math.max(worstGap, s.cycle - prev), last, count, cycles: s.cycle }
  }

  it('поздняя партия не остаётся без событий', () => {
    // Регресс: пул из десяти неповторимых событий вычерпывался к семидесятому
    // циклу, а победный забег длится втрое дольше — две трети партии
    // проходили вообще без единого события.
    const run = eventCoverage('cautious', 7919, 150)
    expect(run.count, `событий за прогон: ${run.count}`).toBeGreaterThan(6)
    expect(run.worstGap, `худший промежуток: ${run.worstGap} циклов`).toBeLessThan(35)
    // Проверяем покрытие относительно длины забега, а не по абсолютному
    // циклу: длина партии меняется от правки к правке, и жёсткое число
    // ловило бы не событийный голод, а изменение темпа игры.
    expect(run.last, `последнее событие на цикле ${run.last} из ${run.cycles}`).toBeGreaterThan(
      run.cycles * 0.6,
    )
  })

  it('повторяемое событие возвращается не раньше своей паузы', () => {
    const repeatable = EVENTS.filter(def => def.repeatable)
    expect(repeatable.length).toBeGreaterThan(5)
    for (const def of repeatable) {
      const pause = def.repeatCooldown ?? BALANCE.events.repeatCooldown
      expect(pause, def.id).toBeGreaterThanOrEqual(BALANCE.events.cooldown * 4)
    }
  })

  it('события распределены по всей партии, а не только по началу', () => {
    const late = EVENTS.filter(def => (def.minCycle ?? 1) >= 40)
    const middle = EVENTS.filter(def => {
      const c = def.minCycle ?? 1
      return c >= 12 && c < 40
    })
    expect(late.length, 'поздних событий').toBeGreaterThanOrEqual(5)
    expect(middle.length, 'средних событий').toBeGreaterThanOrEqual(8)
  })
})
