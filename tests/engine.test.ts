import { describe, expect, it } from 'vitest'
import { reduce } from '@/engine/engine'
import { createInitialState } from '@/engine/state'
import { derive, isAchievementEarned, threatGain } from '@/engine/selectors'
import { BALANCE } from '@/engine/balance'
import { SECTORS } from '@/engine/content'
import { raidChance } from '@/engine/systems/threat'
import type { GameAction } from '@/engine/actions'
import type { GameState } from '@/engine/types'

const start = () => createInitialState(1234)

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce((s, a) => reduce(s, a).state, state)
}

/** Прокручивает N циклов подряд. */
function cycles(state: GameState, count: number): GameState {
  let s = state
  for (let i = 0; i < count; i += 1) s = reduce(s, { type: 'cycle/end' }).state
  return s
}

describe('базовые действия', () => {
  it('сбор плазмы тратит энергию и даёт плазму', () => {
    const before = start()
    const after = run(before, { type: 'action/harvest' })
    expect(after.energy).toBe(before.energy - BALANCE.actions.harvest.energy)
    expect(after.plasma).toBeGreaterThan(before.plasma)
    expect(after.xp).toBeGreaterThan(0)
  })

  it('действие без энергии не проходит и ничего не меняет', () => {
    let s = start()
    s = { ...s, energy: 0 }
    const { state: after, notices } = reduce(s, { type: 'action/harvest' })
    expect(after.plasma).toBe(s.plasma)
    expect(after.energy).toBe(0)
    expect(notices.some(n => n.tone === 'bad')).toBe(true)
  })

  it('энергия возвращается, если не хватило ресурсов на действие', () => {
    let s = start()
    s = { ...s, plasma: 0 }
    const after = run(s, { type: 'action/refine' })
    expect(after.energy).toBe(s.energy)
    expect(after.clots).toBe(s.clots)
  })

  it('ресурсы никогда не уходят в минус', () => {
    let s = start()
    for (let i = 0; i < 40; i += 1) {
      s = run(s, { type: 'action/refine' }, { type: 'action/transmute' }, { type: 'cycle/end' })
    }
    expect(s.plasma).toBeGreaterThanOrEqual(0)
    expect(s.clots).toBeGreaterThanOrEqual(0)
    expect(s.essence).toBeGreaterThanOrEqual(0)
  })
})

describe('цикл', () => {
  it('полностью восстанавливает энергию', () => {
    let s = run(start(), { type: 'action/harvest' }, { type: 'action/harvest' })
    expect(s.energy).toBeLessThan(derive(s).maxEnergy)
    s = reduce(s, { type: 'cycle/end' }).state
    expect(s.energy).toBe(derive(s).maxEnergy)
  })

  it('приносит доход и увеличивает номер цикла', () => {
    const before = start()
    const after = reduce(before, { type: 'cycle/end' }).state
    expect(after.cycle).toBe(before.cycle + 1)
    expect(after.plasma).toBeGreaterThan(before.plasma)
  })
})

/**
 * Регрессии на критические баги версии 1. Каждый тест назван так, чтобы при
 * падении было видно, какой именно старый дефект вернулся.
 */
describe('регрессии v1', () => {
  it('РЕГРЕСС #3: угроза никогда не уходит в отрицательные значения', () => {
    let s = start()
    // Максимальное подавление: маскировка на пределе плюс топовые технологии.
    s = {
      ...s,
      masking: 100,
      techs: { 'essence-distill': 3, 'ether-siphon': 3, 'null-resonance': 3 },
      modules: { 'veil-shroud': 3, 'silent-veil': 3, 'phase-screen': 3, 'null-signature': 3 },
    }
    s = cycles(s, 400)
    expect(s.threat).toBeGreaterThanOrEqual(0)
    expect(s.threat).toBeLessThanOrEqual(100)
  })

  it('РЕГРЕСС #3: прирост угрозы остаётся положительным при любой прокачке', () => {
    let s = start()
    s = {
      ...s,
      masking: 100,
      modules: { 'veil-shroud': 3, 'silent-veil': 3, 'phase-screen': 3, 'null-signature': 3 },
      techs: { 'essence-distill': 3, 'ether-siphon': 3, 'null-resonance': 3, quintessence: 3 },
      doctrines: { 'weaver-1': 3, 'weaver-2': 3, 'weaver-3': 3, 'weaver-4': 3 },
      doctrinePath: 'weaver',
    }
    // Маскировка не должна полностью отключать давление — иначе исчезает игра.
    expect(threatGain(s)).toBeGreaterThan(0)
  })

  it('РЕГРЕСС #4: маскировка реально влияет на прирост угрозы', () => {
    const low = { ...start(), masking: 0 }
    const high = { ...start(), masking: 100 }
    expect(threatGain(high)).toBeLessThan(threatGain(low))
  })

  it('РЕГРЕСС #1: после коллапса сброс всегда доступен', () => {
    let s = { ...start(), integrity: 1, tutorialStep: 0 }
    s = reduce(s, { type: 'action/harvest' }).state
    s = { ...s, integrity: 0 }
    s = reduce(s, { type: 'action/harvest' }).state
    expect(s.phase).toBe('collapsed')

    const restarted = reduce(s, { type: 'game/reset', seed: 7 }).state
    expect(restarted.phase).toBe('command')
    expect(restarted.integrity).toBe(BALANCE.start.integrity)
    expect(restarted.cycle).toBe(1)
  })

  it('РЕГРЕСС #2: обучение не блокирует ни одно действие', () => {
    const s = { ...start(), tutorialStep: 0 }
    // Любое действие проходит вне зависимости от шага обучения.
    const after = reduce(s, { type: 'cycle/end' }).state
    expect(after.cycle).toBe(2)
    const dismissed = reduce(after, { type: 'tutorial/dismiss' }).state
    expect(dismissed.tutorialDismissed).toBe(true)
    // И после повторного включения интерфейс тоже не запирается: движок вообще
    // не знает про блокировки вкладок.
    expect(reduce(dismissed, { type: 'action/harvest' }).state.plasma).toBeGreaterThan(
      dismissed.plasma,
    )
  })

  it('целостность не превышает максимум и не уходит ниже нуля', () => {
    let s = { ...start(), plasma: 100000, essence: 1000 }
    for (let i = 0; i < 20; i += 1) {
      s = run(s, { type: 'action/mend' }, { type: 'cycle/end' })
    }
    expect(s.integrity).toBeLessThanOrEqual(derive(s).maxIntegrity)
    expect(s.integrity).toBeGreaterThanOrEqual(0)
  })
})

describe('шкала рейдов', () => {
  it('ниже порога рейдов нет', () => {
    expect(raidChance(BALANCE.threat.raidThreshold - 1)).toBe(0)
  })

  it('шанс растёт вместе с угрозой', () => {
    expect(raidChance(70)).toBeGreaterThan(raidChance(BALANCE.threat.raidThreshold))
    expect(raidChance(100)).toBeGreaterThan(raidChance(80))
    expect(raidChance(100)).toBeLessThanOrEqual(1)
  })
})

describe('детерминированность', () => {
  it('одинаковое зерно и одинаковые действия дают одинаковый результат', () => {
    const script: GameAction[] = [
      { type: 'action/harvest' },
      { type: 'action/refine' },
      { type: 'cycle/end' },
      { type: 'action/scan' },
      { type: 'cycle/end' },
    ]
    const a = run(createInitialState(555), ...script)
    const b = run(createInitialState(555), ...script)
    expect(a).toEqual(b)
  })

  it('разные зёрна расходятся там, где работает случайность', () => {
    // Случайность расходуется в бою (разброс урона, криты), поэтому
    // расхождение проверяем на серии ударов, а не на «тихих» циклах.
    const fight = (seed: number) => {
      let s = { ...createInitialState(seed), energy: 40 }
      // cap-weave граничит с cap-drift, поэтому сперва занимаем пролив.
      s = reduce(s, { type: 'map/capture', sectorId: 'cap-drift' }).state
      s = reduce(s, { type: 'map/capture', sectorId: 'cap-weave' }).state
      expect(s.phase).toBe('combat')
      for (let i = 0; i < 6; i += 1) {
        s = reduce(s, { type: 'combat/act', action: 'strike' }).state
        if (s.phase !== 'combat') break
      }
      return s
    }
    const a = fight(1)
    const b = fight(999)
    expect(a.combat?.hp ?? -1).not.toBe(b.combat?.hp ?? -2)
  })

  it('рейд приходит при высокой угрозе и его можно отбить', () => {
    let s = { ...createInitialState(4242), threat: 99, energy: 30 }
    let raided = false
    for (let i = 0; i < 30 && !raided; i += 1) {
      s = reduce(s, { type: 'cycle/end' }).state
      if (s.phase === 'combat') raided = true
    }
    expect(raided, 'рейд не пришёл за 30 циклов при угрозе 99').toBe(true)
    expect(s.combat?.forced, 'рейд должен быть навязанным боем').toBe(true)

    const threatBefore = s.threat
    // Добиваем рейдера, дав цитадели заведомо достаточную силу.
    s = { ...s, energy: 99, modules: { 'hem-arsenal': 3, 'apex-lance': 3 }, xp: 5000 }
    for (let i = 0; i < 200 && s.phase === 'combat'; i += 1) {
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    if (s.phase === 'command') {
      expect(s.threat).toBeLessThan(threatBefore)
      expect(s.stats.raidsSurvived).toBeGreaterThan(0)
    }
  })
})

/**
 * Обучение вычисляется из состояния, а не из счётчика. Проверяем, что шаги
 * действительно закрываются игровыми событиями и подсказка не «залипает».
 */
describe('обучение', () => {
  it('шаг закрывается фактом действия, а не порядком', () => {
    const fresh = start()
    expect(fresh.stats.plasmaEarned).toBe(0)

    // Игрок пропустил первые шаги и сразу занял сектор.
    const s = run(fresh, { type: 'map/capture', sectorId: 'cap-drift' })
    expect(s.controlled.length).toBeGreaterThan(1)
    // Награда сектора уже начислила плазму — шаг «соберите плазму» тоже закрыт.
    expect(s.stats.plasmaEarned).toBeGreaterThan(0)
  })

  it('скрытие обучения не мешает играть', () => {
    let s = reduce(start(), { type: 'tutorial/dismiss' }).state
    expect(s.tutorialDismissed).toBe(true)
    s = reduce(s, { type: 'action/harvest' }).state
    expect(s.plasma).toBeGreaterThan(BALANCE.start.plasma)
  })
})

/**
 * Лор открывается по выполненным достижениям, а не по их прогрессу.
 * В state.achievements лежит счётчик, и глава VI («Цена территории»,
 * условие sectors-10) открывалась на старте, приняв «1 сектор из 10» за успех.
 */
describe('открытие лора', () => {
  it('на старте открыта ровно одна глава', () => {
    const s = reduce(start(), { type: 'action/harvest' }).state
    expect(s.lore).toEqual(['origin-spark'])
  })

  it('прогресс накопительного достижения не считается выполнением', () => {
    const s = reduce(start(), { type: 'action/harvest' }).state
    // Счётчик уже есть, но цель не достигнута.
    expect(s.achievements['sectors-10']).toBeGreaterThan(0)
    expect(isAchievementEarned(s, 'sectors-10')).toBe(false)
    expect(s.lore).not.toContain('forge-cost')
  })

  it('глава открывается, когда достижение действительно получено', () => {
    let s = start()
    s = { ...s, controlled: SECTORS.slice(0, 12).map(sec => sec.id) }
    s = reduce(s, { type: 'action/harvest' }).state
    expect(isAchievementEarned(s, 'sectors-10')).toBe(true)
    expect(s.lore).toContain('forge-cost')
  })

  it('бинарное достижение засчитывается сразу', () => {
    const s = reduce(start(), { type: 'action/harvest' }).state
    expect(isAchievementEarned(s, 'first-blood')).toBe(true)
  })
})
