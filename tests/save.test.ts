import { describe, expect, it } from 'vitest'
import { decodeSaveCode, encodeSaveCode, fromUnknown, serialize } from '@/engine/save'
import { decodeText, encodeText } from '@/engine/save/codec'
import { sanitizeState } from '@/engine/save/schema'
import { createInitialState, STATE_VERSION } from '@/engine/state'
import { reduce } from '@/engine/engine'
import type { GameState } from '@/engine/types'

function midGame(): GameState {
  let s = createInitialState(31337)
  s = reduce(s, { type: 'map/capture', sectorId: 'cap-drift' }).state
  s = reduce(s, { type: 'cycle/end' }).state
  s = reduce(s, { type: 'action/harvest' }).state
  s = { ...s, plasma: 5000, clots: 900, essence: 120, xp: 1500 }
  s = reduce(s, { type: 'module/buy', id: 'pulse-harvester' }).state
  s = reduce(s, { type: 'tech/buy', id: 'flux-cores' }).state
  s = reduce(s, { type: 'doctrine/buy', id: 'weaver-1' }).state
  return s
}

describe('кодирование', () => {
  it('кириллица переживает круговой рейс', () => {
    const text = 'Империя крови: сгустки, плазма, эссенция — 100%'
    expect(decodeText(encodeText(text))).toBe(text)
  })

  it('код URL-safe и без набивки', () => {
    const code = encodeText('тест ' + '№'.repeat(50))
    expect(code).not.toMatch(/[+/=]/)
  })

  it('на кириллице кодек вдвое компактнее наивного btoa(encodeURIComponent(...))', () => {
    // Именно этот дефект раздувал сейвы v1: сейв хранил русские названия и
    // описания, а encodeURIComponent превращал каждый символ в «%D0%BF».
    const cyrillic = JSON.stringify({
      log: Array.from({ length: 40 }, () => 'Сектор «Капиллярный пролив» под контролем империи.'),
    })
    const naive = btoa(encodeURIComponent(cyrillic))
    expect(encodeText(cyrillic).length).toBeLessThan(naive.length * 0.5)
  })

  it('сейв не хранит кириллицу: только идентификаторы и числа', () => {
    // Контент живёт в коде, а не в сейве, — поэтому обновление баланса
    // доходит до уже играющих, а сам сейв остаётся маленьким.
    const json = serialize(midGame())
    expect(json).not.toMatch(/[а-яА-ЯёЁ]/)
  })

  it('сейв остаётся компактным: контент не дублируется в состояние', () => {
    const code = encodeSaveCode(midGame())
    expect(code.length).toBeLessThan(4000)
  })
})

describe('загрузка сейва', () => {
  it('круговой рейс сохраняет состояние', () => {
    const original = midGame()
    const result = decodeSaveCode(encodeSaveCode(original))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { log: _a, ...expected } = original
    const { log: _b, ...actual } = result.state
    expect(actual).toEqual(expected)
  })

  it('пустой код отклоняется', () => {
    expect(decodeSaveCode('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('мусор отклоняется, а не роняет игру', () => {
    for (const junk of ['не код', 'HEM1-!!!!', '{}', 'AAAA', '💀💀💀']) {
      const result = decodeSaveCode(junk)
      expect(result.ok, `код «${junk}» не должен грузиться`).toBe(false)
    }
  })

  it('сейв из будущей версии отклоняется, а не портит состояние', () => {
    const future = { ...JSON.parse(serialize(midGame())), version: STATE_VERSION + 5 }
    expect(fromUnknown(future)).toEqual({ ok: false, reason: 'incompatible' })
  })

  it('сейв версии 1 старой игры отклоняется', () => {
    expect(fromUnknown({ version: 0, day: 900, clots: 5 }).ok).toBe(false)
  })
})

/**
 * Главная регрессия по сейвам: в v1 applySavePayload не проверял ничего,
 * поэтому «NaN» и подделанные поля попадали прямо в состояние.
 */
describe('РЕГРЕСС #6: валидация недоверенного сейва', () => {
  it('NaN и нечисловые значения не попадают в состояние', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      plasma: 'много',
      clots: NaN,
      essence: Infinity,
      integrity: null,
      threat: 'высокая',
      cycle: -50,
      xp: undefined,
    })
    expect(state).not.toBeNull()
    if (!state) return
    for (const value of [
      state.plasma,
      state.clots,
      state.essence,
      state.integrity,
      state.threat,
      state.xp,
      state.cycle,
    ]) {
      expect(Number.isFinite(value)).toBe(true)
    }
    expect(state.cycle).toBeGreaterThanOrEqual(1)
    expect(state.threat).toBeLessThanOrEqual(100)
  })

  it('неизвестные модули, доктрины и секторы отбрасываются', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      modules: { 'pulse-harvester': 2, 'чит-модуль': 99 },
      doctrines: { 'weaver-1': 1, hack: 50 },
      techs: { 'flux-cores': 1, nope: 7 },
      controlled: ['cap-drift', 'сектор-которого-нет'],
      achievements: { 'first-blood': 1, fake: 1 },
    })
    expect(state).not.toBeNull()
    if (!state) return
    expect(Object.keys(state.modules)).toEqual(['pulse-harvester'])
    expect(Object.keys(state.doctrines)).toEqual(['weaver-1'])
    expect(Object.keys(state.techs)).toEqual(['flux-cores'])
    expect(state.controlled).not.toContain('сектор-которого-нет')
    expect(Object.keys(state.achievements)).toEqual(['first-blood'])
  })

  it('уровни выше максимума обрезаются', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      modules: { 'pulse-harvester': 9999 },
    })
    expect(state?.modules['pulse-harvester']).toBe(3)
  })

  it('стартовый сектор нельзя потерять', () => {
    const state = sanitizeState({ version: STATE_VERSION, controlled: [] })
    expect(state?.controlled).toContain('cap-core')
  })

  it('битый бой не оставляет зависший оверлей', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      phase: 'combat',
      combat: { enemyId: 'такого-врага-нет', hp: 10, maxHp: 10 },
    })
    expect(state?.combat).toBeNull()
    expect(state?.phase).toBe('command')
  })

  it('сейв с нулевой целостностью открывается как коллапс, а не как рабочий бой', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      integrity: 0,
      phase: 'combat',
      combat: { enemyId: 'scout-phage', hp: 5, maxHp: 40 },
    })
    expect(state?.phase).toBe('collapsed')
    expect(state?.combat).toBeNull()
  })

  it('журнал обрезается и очищается от мусора', () => {
    const log = Array.from({ length: 500 }, (_, i) => ({ cycle: i, message: 'x', tone: 'weird' }))
    const state = sanitizeState({ version: STATE_VERSION, log: [...log, null, 42, {}] })
    expect(state).not.toBeNull()
    if (!state) return
    expect(state.log.length).toBeLessThanOrEqual(60)
    expect(state.log.every(e => e.tone === 'info')).toBe(true)
  })
})
