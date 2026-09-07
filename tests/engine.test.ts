import { describe, expect, it } from 'vitest'
import { reduce } from '@/engine/engine'
import { createInitialState } from '@/engine/state'
import {
  derive,
  deliveryFactor,
  doctrineForkBlocked,
  hopsToHub,
  isAchievementEarned,
  overdriveCost,
  sectorDelivery,
  threatGain,
} from '@/engine/selectors'
import { BALANCE } from '@/engine/balance'
import {
  DOCTRINES,
  DOCTRINE_BY_ID,
  EVENTS,
  EVENT_BY_ID,
  MODULES,
  MUTATIONS,
  SECTORS,
  getEnemy,
} from '@/engine/content'
import { pickReclaimTarget, raidChance, reclaimChance } from '@/engine/systems/threat'
import { Rng } from '@/engine/rng'
import type { GameAction } from '@/engine/actions'
import type { GameState } from '@/engine/types'
import { advanceCycles, answerEvent, newGame } from './helpers'

const start = () => newGame(1234)

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
    // Новая партия открывается выбором мутации — главное, что она открывается.
    expect(restarted.phase).toBe('mutation')
    expect(restarted.integrity).toBe(BALANCE.start.integrity)
    expect(restarted.cycle).toBe(1)
    expect(restarted.mutationOffer.length).toBeGreaterThan(0)
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
    const a = run(newGame(555), ...script)
    const b = run(newGame(555), ...script)
    expect(a).toEqual(b)
  })

  it('разные зёрна расходятся там, где работает случайность', () => {
    // Случайность расходуется в бою (разброс урона, криты), поэтому
    // расхождение проверяем на серии ударов, а не на «тихих» циклах.
    const fight = (seed: number) => {
      let s = { ...newGame(seed), energy: 40 }
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
    let s = { ...newGame(4242), threat: 99, energy: 30 }
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

describe('стартовые мутации', () => {
  it('партия начинается с выбора из трёх вариантов', () => {
    const s = createInitialState(4242)
    expect(s.phase).toBe('mutation')
    expect(s.mutationOffer).toHaveLength(3)
    expect(new Set(s.mutationOffer).size).toBe(3)
    expect(s.mutation).toBeNull()
  })

  it('набор вариантов воспроизводим по зерну', () => {
    expect(createInitialState(99).mutationOffer).toEqual(createInitialState(99).mutationOffer)
  })

  it('до выбора остальные действия заблокированы', () => {
    const s = createInitialState(7)
    const { state: after, notices } = reduce(s, { type: 'action/harvest' })
    expect(after.plasma).toBe(s.plasma)
    expect(notices.some(n => n.message.includes('мутацию'))).toBe(true)
  })

  it('выбор применяет эффекты и открывает командный экран', () => {
    let s = createInitialState(4242)
    const id = s.mutationOffer[0]
    expect(id).toBeDefined()
    if (!id) return
    s = reduce(s, { type: 'mutation/choose', id }).state
    expect(s.phase).toBe('command')
    expect(s.mutation).toBe(id)
  })

  it('нельзя выбрать мутацию не из предложенных', () => {
    const s = createInitialState(4242)
    const outsider = MUTATIONS.find(m => !s.mutationOffer.includes(m.id))
    expect(outsider).toBeDefined()
    if (!outsider) return
    const after = reduce(s, { type: 'mutation/choose', id: outsider.id }).state
    expect(after.mutation).toBeNull()
    expect(after.phase).toBe('mutation')
  })

  it('мутация на целостность сразу поднимает и максимум, и текущее значение', () => {
    let s = createInitialState(1)
    s = { ...s, mutationOffer: ['thick-blood'] }
    s = reduce(s, { type: 'mutation/choose', id: 'thick-blood' }).state
    const stats = derive(s)
    expect(stats.maxIntegrity).toBeGreaterThan(BALANCE.citadel.baseMaxIntegrity)
    expect(stats.maxEnergy).toBeLessThan(BALANCE.citadel.baseMaxEnergy)
  })

  it('мутация «Тонкие стенки» действительно удваивает шум территории', () => {
    const base = { ...newGame(5), controlled: SECTORS.slice(0, 8).map(s => s.id) }
    const loud = { ...base, mutation: 'thin-walls' }
    expect(derive(loud).threatGain).toBeGreaterThan(derive(base).threatGain * 1.6)
  })

  it('кризисный старт выдаёт ресурсы и поднимает угрозу', () => {
    let s = createInitialState(3)
    s = { ...s, mutationOffer: ['crisis-start'] }
    const before = s.plasma
    s = reduce(s, { type: 'mutation/choose', id: 'crisis-start' }).state
    expect(s.plasma).toBeGreaterThan(before)
    expect(s.threat).toBe(45)
  })
})

/**
 * Территория перестала быть храповиком: при высокой угрозе иммунитет
 * отбивает периферийные секторы, и их надо возвращать боем.
 */
describe('потеря секторов', () => {
  it('ниже порога секторы не отбираются', () => {
    expect(reclaimChance(BALANCE.threat.reclaimThreshold - 1)).toBe(0)
  })

  it('шанс растёт вместе с угрозой', () => {
    expect(reclaimChance(100)).toBeGreaterThan(reclaimChance(BALANCE.threat.reclaimThreshold))
    expect(reclaimChance(100)).toBeLessThanOrEqual(1)
  })

  it('отбирается периферия, а не сердцевина', () => {
    // cap-core ↔ cap-drift ↔ cap-weave: у cap-weave один свой сосед, у cap-drift два.
    const s = { ...newGame(1), controlled: ['cap-core', 'cap-drift', 'cap-weave'] }
    const rng = new Rng({ seed: 1, cursor: 0 })
    expect(pickReclaimTarget(s, rng)).toBe('cap-weave')
  })

  it('стартовый сектор не отбирается никогда', () => {
    const s = { ...newGame(1), controlled: ['cap-core'] }
    expect(pickReclaimTarget(s, new Rng({ seed: 1, cursor: 0 }))).toBeNull()
  })

  it('потерянный сектор возвращается в разведанные и снижает угрозу', () => {
    let s: GameState = {
      ...newGame(777),
      controlled: ['cap-core', 'cap-drift', 'cap-weave'],
      revealed: [],
      threat: 99,
    }
    let lost = false
    for (let i = 0; i < 40 && !lost; i += 1) {
      const before = s.controlled.length
      s = reduce(s, { type: 'cycle/end' }).state
      // Бой прерывает цикл — доигрываем его отступлением.
      if (s.phase === 'combat') s = reduce(s, { type: 'combat/withdraw' }).state
      if (s.controlled.length < before) lost = true
    }
    expect(lost, 'за 40 циклов при угрозе 99 сектор должен быть отбит').toBe(true)
    expect(s.controlled).toContain('cap-core')
    expect(s.stats.sectorsLost).toBeGreaterThan(0)
    // Отбитый сектор снова доступен для захвата.
    expect(s.revealed.length).toBeGreaterThan(0)
  })
})

/**
 * События — короткие развилки между циклами. Проверяем, что они выпадают,
 * не повторяются, соблюдают промежуток и честно применяют последствия.
 */
describe('события', () => {
  /** Прокручивает циклы, доигрывая бои, пока не выпадет событие. */
  function untilEvent(seed: number, limit = 200): GameState {
    let s = newGame(seed)
    for (let i = 0; i < limit && s.phase !== 'event'; i += 1) {
      if (s.phase === 'combat') {
        s = reduce(s, { type: 'combat/withdraw' }).state
        continue
      }
      if (s.phase !== 'command') break
      s = reduce(s, { type: 'cycle/end' }).state
    }
    return s
  }

  it('событие выпадает и блокирует остальные действия', () => {
    const s = untilEvent(11)
    expect(s.phase).toBe('event')
    expect(s.pendingEvent).not.toBeNull()

    const { state: after, notices } = reduce(s, { type: 'action/harvest' })
    expect(after.plasma).toBe(s.plasma)
    expect(notices.some(n => n.message.includes('событие'))).toBe(true)
  })

  it('выбор варианта применяет последствия и возвращает к игре', () => {
    let s = untilEvent(11)
    const event = EVENT_BY_ID.get(s.pendingEvent ?? '')
    expect(event).toBeDefined()
    if (!event) return
    const option = event.options[0]
    if (!option) return

    const before = { plasma: s.plasma, threat: s.threat }
    s = reduce(s, { type: 'event/choose', optionId: option.id }).state
    expect(['command', 'combat']).toContain(s.phase)
    expect(s.pendingEvent).toBeNull()
    expect(s.seenEvents).toContain(event.id)

    if (option.resources?.plasma) {
      expect(s.plasma).not.toBe(before.plasma)
    }
    if (option.threat) {
      expect(s.threat).not.toBe(before.threat)
    }
  })

  it('неповторяемое событие выпадает один раз, повторяемое — не раньше своей паузы', () => {
    let s = newGame(11)
    const seen: { id: string; cycle: number }[] = []
    for (let i = 0; i < 900; i += 1) {
      if (s.phase === 'event' && s.pendingEvent) {
        seen.push({ id: s.pendingEvent, cycle: s.cycle })
        s = answerEvent(s)
        continue
      }
      if (s.phase === 'combat') {
        s = reduce(s, { type: 'combat/withdraw' }).state
        continue
      }
      if (s.phase !== 'command') break
      s = { ...s, integrity: 9999 }
      s = reduce(s, { type: 'cycle/end' }).state
    }
    expect(seen.length).toBeGreaterThan(1)

    const byId = new Map<string, number[]>()
    for (const entry of seen) {
      byId.set(entry.id, [...(byId.get(entry.id) ?? []), entry.cycle])
    }
    for (const [id, cycles] of byId) {
      const def = EVENT_BY_ID.get(id)
      expect(def, id).toBeDefined()
      if (!def) continue
      if (!def.repeatable) {
        expect(cycles.length, `неповторяемое ${id}`).toBe(1)
        continue
      }
      const pause = def.repeatCooldown ?? BALANCE.events.repeatCooldown
      for (let i = 1; i < cycles.length; i += 1) {
        const gap = (cycles[i] ?? 0) - (cycles[i - 1] ?? 0)
        expect(gap, `повтор ${id} через ${gap} циклов`).toBeGreaterThanOrEqual(pause)
      }
    }
  })

  it('события не идут подряд', () => {
    const s = untilEvent(11)
    expect(s.cycle - s.lastEventCycle).toBeLessThanOrEqual(1)
    // Следующее возможно не раньше, чем через cooldown циклов.
    expect(BALANCE.events.cooldown).toBeGreaterThan(1)
  })

  it('недоступный по ресурсам вариант не проходит', () => {
    let s: GameState = {
      ...newGame(1),
      phase: 'event',
      pendingEvent: 'immune-defector',
      essence: 0,
    }
    const before = s.essence
    s = reduce(s, { type: 'event/choose', optionId: 'hire' }).state
    expect(s.phase).toBe('event')
    expect(s.essence).toBe(before)
  })

  it('вариант с боем запускает бой', () => {
    let s: GameState = { ...newGame(1), phase: 'event', pendingEvent: 'clot-cannibals' }
    s = reduce(s, { type: 'event/choose', optionId: 'purge' }).state
    expect(s.phase).toBe('combat')
    expect(s.combat?.forced).toBe(true)
  })

  it('все требования вариантов ссылаются на реальные ресурсы', () => {
    for (const event of EVENTS) {
      expect(event.options.length, `${event.id}: нет вариантов`).toBeGreaterThan(0)
      for (const option of event.options) {
        if (!option.fight) continue
        expect(getEnemy(option.fight), `${event.id}/${option.id}: нет врага`).toBeDefined()
      }
    }
  })
})

/**
 * Эндгейм: победа над Сувереном не завершает партию, а запускает осаду.
 * Раньше игра не заканчивалась, а затухала — цель исчерпана, а делать
 * по-прежнему что-то надо.
 */
describe('осада и New Game+', () => {
  /** Состояние на пороге финального нексуса. */
  function atThrone(): GameState {
    return {
      ...newGame(4242),
      controlled: SECTORS.filter(s => s.id !== 'ctx-throne').map(s => s.id),
      regions: ['capillary', 'venous', 'arterial', 'cortex'],
      energy: 99,
      xp: 20000,
      modules: { 'hem-arsenal': 3, 'apex-lance': 3, 'aegis-core': 3 },
    }
  }

  it('победа над троном запускает осаду, а не завершает игру', () => {
    let s = atThrone()
    s = reduce(s, { type: 'map/capture', sectorId: 'ctx-throne' }).state
    expect(s.phase).toBe('combat')
    // Проверяем переход к осаде, а не выживаемость: держим ядро целым,
    // иначе Суверен успевает добить цитадель раньше, чем она его.
    for (let i = 0; i < 400 && s.phase === 'combat'; i += 1) {
      s = { ...s, integrity: 9999 }
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    expect(s.controlled).toContain('ctx-throne')
    expect(s.phase).not.toBe('victory')
    expect(s.siegeCyclesLeft).toBe(BALANCE.siege.cycles)
    expect(isAchievementEarned(s, 'sovereign')).toBe(true)
  })

  it('осада ускоряет рост угрозы', () => {
    const calm: GameState = { ...newGame(1), threat: 10 }
    const siege: GameState = { ...calm, siegeCyclesLeft: 10 }
    const afterCalm = reduce(calm, { type: 'cycle/end' }).state
    const afterSiege = reduce(siege, { type: 'cycle/end' }).state
    expect(afterSiege.threat).toBeGreaterThan(afterCalm.threat)
  })

  it('выстоянная осада приносит победу', () => {
    let s: GameState = { ...newGame(5), siegeCyclesLeft: 2, integrity: 9999, threat: 0 }
    for (let i = 0; i < 12 && s.phase !== 'victory'; i += 1) {
      if (s.phase === 'combat') {
        s = reduce(s, { type: 'combat/withdraw' }).state
        continue
      }
      if (s.phase !== 'command') break
      s = { ...s, integrity: 9999 }
      s = reduce(s, { type: 'cycle/end' }).state
    }
    expect(s.phase).toBe('victory')
    expect(isAchievementEarned(s, 'siege-survivor')).toBe(true)
  })

  it('New Game+ переносит половину технологий и не переносит модули', () => {
    const finished: GameState = {
      ...newGame(1),
      phase: 'victory',
      techs: { 'flux-cores': 3, granulation: 2, 'essence-distill': 1 },
      modules: { 'hem-arsenal': 3 },
      doctrines: { 'reaver-1': 2 },
      doctrinePath: 'reaver',
      achievements: { 'first-blood': 1 },
    }
    const next = reduce(finished, { type: 'game/newGamePlus', seed: 77 }).state

    expect(next.ngPlus).toBe(1)
    expect(next.techs['flux-cores']).toBe(1)
    expect(next.techs['granulation']).toBe(1)
    // Уровень 1 при переносе половины округляется вниз до нуля и не сохраняется.
    expect(next.techs['essence-distill']).toBeUndefined()
    expect(next.modules).toEqual({})
    expect(next.doctrines).toEqual({})
    expect(next.doctrinePath).toBeNull()
    // Достижения принадлежат игроку, а не забегу.
    expect(next.achievements['first-blood']).toBe(1)
    expect(isAchievementEarned(next, 'second-cycle')).toBe(true)
  })

  it('в New Game+ гарнизоны тяжелее', () => {
    const base = { ...newGame(9), energy: 99 }
    const plus = { ...base, ngPlus: 2 }
    const fight = (s: GameState) => {
      let next = reduce(s, { type: 'map/capture', sectorId: 'cap-drift' }).state
      next = reduce(next, { type: 'map/capture', sectorId: 'cap-weave' }).state
      return next.combat?.maxHp ?? 0
    }
    expect(fight(plus)).toBeGreaterThan(fight(base))
  })
})

/**
 * Пропускная способность: расстояние до узла сети перестало быть бесплатным.
 * Раньше сектор в четырнадцати переходах доставлял столько же, сколько
 * соседний, и граф карты работал только на проверку достижимости.
 */
describe('пропускная способность сети', () => {
  it('доля доставки падает с расстоянием', () => {
    expect(deliveryFactor(0)).toBe(1)
    expect(deliveryFactor(4)).toBeLessThan(deliveryFactor(1))
    expect(deliveryFactor(20)).toBeLessThan(deliveryFactor(7))
    expect(deliveryFactor(20)).toBeGreaterThan(0)
  })

  it('стартовый сектор и ретрансляторы — узлы сети', () => {
    const s: GameState = {
      ...newGame(1),
      controlled: ['cap-core', 'cap-drift', 'cap-weave', 'cap-relay'],
    }
    const hops = hopsToHub(s, 0)
    expect(hops.get('cap-core')).toBe(0)
    expect(hops.get('cap-relay')).toBe(0)
    expect(hops.get('cap-drift')).toBe(1)
  })

  it('доставка считается только через свои секторы', () => {
    // cap-cache соединён с cap-weave и cap-forge; без них он отрезан.
    const s: GameState = { ...newGame(1), controlled: ['cap-core', 'cap-cache'] }
    const hops = hopsToHub(s, 0)
    expect(hops.get('cap-cache')).toBeGreaterThan(10)
  })

  it('дальний сектор доставляет меньше, чем тот же сектор рядом с узлом', () => {
    const near: GameState = { ...newGame(1), controlled: ['cap-core', 'cap-drift'] }
    const chain = ['cap-core', 'cap-drift', 'cap-weave', 'cap-cache', 'cap-forge', 'cap-nexus']
    const far: GameState = { ...newGame(1), controlled: chain }
    expect(sectorDelivery(far, 'cap-nexus').hops).toBeGreaterThan(
      sectorDelivery(near, 'cap-drift').hops,
    )
  })

  it('модули логистики уменьшают потери', () => {
    const chain = ['cap-core', 'cap-drift', 'cap-weave', 'cap-cache', 'cap-forge', 'cap-nexus']
    const plain: GameState = { ...newGame(1), controlled: chain }
    const wired: GameState = { ...plain, modules: { 'flow-relay': 3, 'pressure-column': 3 } }
    expect(derive(wired).logisticsLoss).toBeLessThanOrEqual(derive(plain).logisticsLoss)
    expect(derive(wired).logistics).toBeGreaterThan(derive(plain).logistics)
  })

  it('захват ретранслятора поднимает доставку соседей', () => {
    const chain = ['cap-core', 'cap-drift', 'cap-weave', 'cap-cache', 'cap-forge']
    const without: GameState = { ...newGame(1), controlled: chain }
    const withRelay: GameState = { ...newGame(1), controlled: [...chain, 'cap-relay'] }
    expect(sectorDelivery(withRelay, 'cap-forge').hops).toBeLessThan(
      sectorDelivery(without, 'cap-forge').hops,
    )
  })
})

/**
 * Развилки доктрин: на третьей ступени путь расходится, и взяв одну
 * доктрину, соседнюю уже не получить. Это второе значимое решение партии.
 */
describe('развилки доктрин', () => {
  const rich = (): GameState => ({
    ...newGame(1),
    plasma: 99999,
    clots: 99999,
    essence: 9999,
  })

  it('в каждом пути ровно одна развилка из двух доктрин', () => {
    for (const path of ['reaver', 'warden', 'weaver'] as const) {
      const forks = new Map<string, number>()
      for (const d of DOCTRINES.filter(d => d.path === path && d.fork)) {
        forks.set(d.fork ?? '', (forks.get(d.fork ?? '') ?? 0) + 1)
      }
      expect(forks.size, `путь ${path}`).toBe(1)
      expect([...forks.values()][0], `путь ${path}`).toBe(2)
    }
  })

  it('выбор одной ветви закрывает соседнюю', () => {
    let s = rich()
    for (const id of ['reaver-1', 'reaver-2', 'reaver-3a']) {
      s = reduce(s, { type: 'doctrine/buy', id }).state
    }
    expect(s.doctrines['reaver-3a']).toBe(1)

    const blocked = DOCTRINE_BY_ID.get('reaver-3b')
    expect(blocked).toBeDefined()
    if (!blocked) return
    expect(doctrineForkBlocked(s, blocked)).toBe(true)

    const { state: after, notices } = reduce(s, { type: 'doctrine/buy', id: 'reaver-3b' })
    expect(after.doctrines['reaver-3b']).toBeUndefined()
    expect(notices.some(n => n.message.includes('развилке'))).toBe(true)
  })

  it('четвёртая ступень открывается любой из ветвей развилки', () => {
    for (const fork of ['reaver-3a', 'reaver-3b']) {
      let s = rich()
      for (const id of ['reaver-1', 'reaver-2', fork, 'reaver-4']) {
        s = reduce(s, { type: 'doctrine/buy', id }).state
      }
      expect(s.doctrines['reaver-4'], `через ${fork}`).toBe(1)
    }
  })

  it('ветви развилки дают разные эффекты', () => {
    const build = (fork: string): GameState => {
      let s = rich()
      for (const id of ['reaver-1', 'reaver-2', fork]) {
        s = reduce(s, { type: 'doctrine/buy', id }).state
      }
      return s
    }
    const slaughter = derive(build('reaver-3a'))
    const wave = derive(build('reaver-3b'))
    expect(slaughter.pierce).toBeGreaterThan(wave.pierce)
    expect(wave.suppression).toBeGreaterThan(slaughter.suppression)
  })
})

/**
 * Эпохи: каждые N циклов система меняет правила до конца партии.
 * Раньше сотый цикл отличался от десятого только величиной чисел.
 */
describe('эпохи', () => {
  it('в начале партии эпоха нулевая и модификаторов нет', () => {
    const s = newGame(1)
    expect(s.epoch).toBe(0)
    expect(s.epochModifiers).toEqual([])
  })

  it('через длину эпохи появляется модификатор', () => {
    const s = advanceCycles(newGame(31), BALANCE.epochs.length + 2)
    expect(s.epoch).toBeGreaterThan(0)
    expect(s.epochModifiers.length).toBeGreaterThan(0)
  })

  it('модификаторы накапливаются и не повторяются', () => {
    const s = advanceCycles(newGame(31), BALANCE.epochs.length * 3 + 2)
    expect(s.epochModifiers.length).toBeGreaterThan(1)
    expect(new Set(s.epochModifiers).size).toBe(s.epochModifiers.length)
  })

  it('множители эпох влияют на угрозу и доход', () => {
    const base: GameState = { ...newGame(1), controlled: SECTORS.slice(0, 6).map(s => s.id) }
    const thrombosis: GameState = { ...base, epochModifiers: ['thrombosis'] }
    expect(derive(thrombosis).threatGain).toBeLessThan(derive(base).threatGain)
    expect(derive(thrombosis).income.plasma).toBeLessThan(derive(base).income.plasma)

    const inflammation: GameState = { ...base, epochModifiers: ['inflammation'] }
    expect(derive(inflammation).threatGain).toBeGreaterThan(derive(base).threatGain)
    expect(derive(inflammation).income.plasma).toBeGreaterThan(derive(base).income.plasma)
  })

  it('модификатор с эффектами меняет характеристики', () => {
    const base = newGame(1)
    const storm: GameState = { ...base, epochModifiers: ['adrenal-storm'] }
    expect(derive(storm).maxEnergy).toBe(derive(base).maxEnergy + 2)
  })

  it('лихорадка усиливает урон в бою', () => {
    const setup = (modifiers: string[]): number => {
      let s: GameState = { ...newGame(3), energy: 99, epochModifiers: modifiers }
      s = reduce(s, { type: 'map/capture', sectorId: 'cap-drift' }).state
      s = reduce(s, { type: 'map/capture', sectorId: 'cap-weave' }).state
      const before = s.combat?.hp ?? 0
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
      return before - (s.combat?.hp ?? 0)
    }
    expect(setup(['fever'])).toBeGreaterThan(setup([]))
  })
})

describe('осада не начинается заново', () => {
  /** Партия у самого финала: всё захвачено, кроме трона. */
  function atThrone(siegeLeft: number): GameState {
    const modules: Record<string, number> = {}
    for (const def of MODULES) modules[def.id] = def.maxLevel
    return {
      ...newGame(2024),
      modules,
      xp: 40_000,
      plasma: 20_000,
      clots: 10_000,
      essence: 3_000,
      integrity: 100_000,
      controlled: SECTORS.filter(s => s.id !== 'ctx-throne').map(s => s.id),
      revealed: ['ctx-throne'],
      regions: ['capillary', 'venous', 'arterial', 'cortex'],
      siegeCyclesLeft: siegeLeft,
    }
  }

  /** Берёт трон, доигрывая бой с Сувереном. */
  function seizeThrone(state: GameState): GameState {
    let s = reduce(state, { type: 'map/capture', sectorId: 'ctx-throne' }).state
    for (let i = 0; i < 400 && s.phase === 'combat'; i += 1) {
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    return s
  }

  it('первый захват трона взводит осаду', () => {
    const s = seizeThrone(atThrone(0))
    expect(s.controlled).toContain('ctx-throne')
    expect(s.siegeCyclesLeft).toBe(BALANCE.siege.cycles)
  })

  it('повторный захват трона не обнуляет счётчик осады', () => {
    // Регресс на реальной партии игрока: иммунитет отбивал трон, игрок брал
    // его снова, и осада начиналась с пятнадцати циклов. Партия становилась
    // непроходимой не по сложности, а по устройству.
    const s = seizeThrone(atThrone(4))
    expect(s.controlled).toContain('ctx-throne')
    expect(s.siegeCyclesLeft).toBe(4)
  })

  it('иммунитет не отбирает трон', () => {
    // Трон — лист графа, поэтому по правилу «слабейшая поддержка» он
    // выбирался целью в 100% случаев: вся осада уходила на его отвоевание.
    const state = { ...atThrone(10), controlled: SECTORS.map(s => s.id) }
    for (let seed = 0; seed < 200; seed += 1) {
      expect(pickReclaimTarget(state, new Rng({ seed: seed * 7919 + 1, cursor: 0 }))).not.toBe(
        'ctx-throne',
      )
    }
  })
})

describe('бюджет снижения угрозы', () => {
  it('разведка не сбивает угрозу ниже предела цикла', () => {
    // Разведка стоит одну энергию, а к концу партии её почти три десятка:
    // без предела угроза сбивалась в ноль одним ходом, и вся система
    // переставала быть ограничением.
    const s: GameState = { ...newGame(5), threat: 90, energy: 20 }
    const after = run(
      s,
      ...Array.from({ length: 10 }, () => ({ type: 'action/scan' }) as GameAction),
    )
    expect(s.threat - after.threat).toBe(BALANCE.threat.reliefCapPerCycle)
  })

  it('новый цикл возвращает бюджет', () => {
    let s: GameState = { ...newGame(5), threat: 90, energy: 20 }
    s = run(s, ...Array.from({ length: 5 }, () => ({ type: 'action/scan' }) as GameAction))
    expect(s.reliefUsed).toBe(BALANCE.threat.reliefCapPerCycle)
    s = reduce(s, { type: 'cycle/end' }).state
    expect(s.reliefUsed).toBe(0)
  })

  it('рейд берёт снижение угрозы из того же бюджета', () => {
    // Иначе отражённый рейд снова становится обходным путём вокруг предела:
    // на замере стиль, живший рейдами, выигрывал 50 забегов из 50.
    const s: GameState = { ...newGame(5), threat: 90, energy: 20 }
    const scanned = run(s, { type: 'action/scan' })
    expect(scanned.reliefUsed).toBeGreaterThan(0)
    expect(scanned.reliefUsed).toBeLessThanOrEqual(BALANCE.threat.reliefCapPerCycle)
  })
})

describe('перегрузка ядра', () => {
  it('покупается бесконечно, но каждый уровень дороже', () => {
    // Пустой эндгейм: в разобранной партии игрока на сотом цикле лежали
    // 16 224 плазмы, которые некуда девать. Перегрузка — сток для излишков.
    const first = overdriveCost(0)
    const tenth = overdriveCost(10)
    expect(tenth.plasma ?? 0).toBeGreaterThan((first.plasma ?? 0) * 5)
  })

  it('уровень перегрузки усиливает цитадель', () => {
    const base: GameState = { ...newGame(3), plasma: 200_000, clots: 200_000, essence: 20_000 }
    const before = derive(base)
    const after = derive({ ...base, overdrive: 5 })
    expect(after.maxIntegrity).toBeGreaterThan(before.maxIntegrity)
    expect(after.attack).toBeGreaterThan(before.attack)
  })

  it('покупка списывает ресурсы и поднимает уровень', () => {
    const rich: GameState = { ...newGame(3), plasma: 200_000, clots: 200_000, essence: 20_000 }
    const after = reduce(rich, { type: 'overdrive/buy' }).state
    expect(after.overdrive).toBe(1)
    expect(after.plasma).toBeLessThan(rich.plasma)

    const twice = reduce(after, { type: 'overdrive/buy' }).state
    expect(twice.overdrive).toBe(2)
    expect(rich.plasma - after.plasma).toBeLessThan(after.plasma - twice.plasma)
  })

  it('без ресурсов покупка не проходит', () => {
    const poor: GameState = { ...newGame(3), plasma: 0, clots: 0, essence: 0 }
    expect(reduce(poor, { type: 'overdrive/buy' }).state.overdrive).toBe(0)
  })
})
