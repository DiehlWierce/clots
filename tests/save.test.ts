import { describe, expect, it } from 'vitest'
import {
  SLOT_COUNT,
  SLOT_INTERVAL,
  compareSaves,
  decodeSaveCode,
  decodeSaveCodeAsync,
  encodeSaveCodeCompressed,
  isCompressed,
  isCompressionAvailable,
  shouldSnapshot,
  encodeSaveCode,
  fromCloudPayload,
  fromUnknown,
  serialize,
  toCloudPayload,
} from '@/engine/save'
import { decodeText, encodeText } from '@/engine/save/codec'
import { sanitizeState } from '@/engine/save/schema'
import { STATE_VERSION } from '@/engine/state'
import { reduce } from '@/engine/engine'
import type { GameState, Phase } from '@/engine/types'
import {
  ACHIEVEMENTS,
  EVENT_BY_ID,
  ALL_CHAPTERS,
  DOCTRINES,
  EPOCH_MODIFIERS,
  EVENTS,
  MODULES,
  SECTORS,
  TECHS,
} from '@/engine/content'
import { CLOUD_CHUNK_SIZE, CLOUD_VALUE_LIMIT } from '@/telegram/cloud'
import { newGame } from './helpers'

function midGame(): GameState {
  let s = newGame(31337)
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

/**
 * Синхронизация с облаком Telegram: прогресс не должен быть привязан к
 * устройству, но и «откатить» партию облако не имеет права.
 */
describe('разрешение конфликта партий', () => {
  const at = (cycle: number): GameState => ({ ...newGame(1), cycle })

  it('без облачной партии остаётся локальная', () => {
    expect(compareSaves(at(5), null)).toBe('local')
  })

  it('без локальной берётся облачная', () => {
    expect(compareSaves(null, at(5))).toBe('cloud')
  })

  it('побеждает более поздняя партия', () => {
    expect(compareSaves(at(10), at(20))).toBe('cloud')
    expect(compareSaves(at(20), at(10))).toBe('local')
  })

  it('при равенстве облако не перетирает локальную партию', () => {
    // Иначе перезагрузка страницы могла бы откатить только что сделанный ход.
    expect(compareSaves(at(10), at(10))).toBe('equal')
  })

  it('облачная нагрузка — тот же код сохранения и читается обратно', () => {
    const state = midGame()
    const payload = toCloudPayload(state)
    const restored = fromCloudPayload(payload)
    expect(restored).not.toBeNull()
    expect(restored?.cycle).toBe(state.cycle)
  })

  it('мусор из облака не ломает игру', () => {
    expect(fromCloudPayload('не код')).toBeNull()
    expect(fromCloudPayload('')).toBeNull()
  })
})

it('даже предельно прокачанная партия влезает в лимит облака Telegram', () => {
  // CloudStorage не принимает значения длиннее 4096 символов. Если контент
  // вырастет и сейв перестанет помещаться, синхронизация молча отключится —
  // поэтому запас проверяется тестом, а не на глаз.
  const maxed: GameState = {
    ...newGame(1),
    controlled: SECTORS.map(s => s.id),
    revealed: [],
    modules: Object.fromEntries(MODULES.map(m => [m.id, m.maxLevel])),
    techs: Object.fromEntries(TECHS.map(t => [t.id, t.maxLevel])),
    doctrines: Object.fromEntries(DOCTRINES.map(d => [d.id, d.maxLevel])),
    achievements: Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a.target ?? 1])),
    lore: ALL_CHAPTERS.map(c => c.id),
    seenEvents: EVENTS.map(e => e.id),
    epochModifiers: EPOCH_MODIFIERS.map(m => m.id),
    cycle: 999,
  }
  // Одного ключа уже не хватает — именно поэтому запись идёт по частям.
  const code = encodeSaveCode(maxed)
  const chunks = Math.ceil(code.length / CLOUD_CHUNK_SIZE)
  expect(chunks).toBeGreaterThan(0)
  expect(chunks).toBeLessThanOrEqual(32)
  expect(CLOUD_CHUNK_SIZE).toBeLessThanOrEqual(CLOUD_VALUE_LIMIT)
})

/**
 * Список открытых глав хранится в сейве, поэтому глава, открытая по ошибке
 * прошлой версией игры, осталась бы навсегда. При загрузке список
 * пересобирается по правилам — сейв лечит себя сам.
 */
describe('самолечение летописи', () => {
  it('глава без выполненного условия убирается при загрузке', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      cycle: 8,
      xp: 120,
      controlled: ['cap-core', 'cap-drift', 'cap-silt', 'cap-weave'],
      achievements: { 'sectors-10': 4, 'first-module': 1 },
      // forge-cost требует достижения sectors-10, а взято лишь 4 сектора.
      lore: ['origin-spark', 'origin-hunger', 'origin-shape', 'forge-cost'],
    })
    expect(state?.lore).not.toContain('forge-cost')
  })

  it('законно открытые главы сохраняются', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      controlled: ['cap-core', 'cap-drift'],
      achievements: { 'first-module': 1 },
      lore: ['origin-spark', 'origin-hunger', 'origin-shape'],
    })
    // Первая открыта всегда, вторая — за захват пролива, третья — за модуль.
    expect(state?.lore).toEqual(['origin-spark', 'origin-hunger', 'origin-shape'])
  })

  it('несуществующая глава отбрасывается', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      lore: ['origin-spark', 'глава-которой-нет'],
    })
    expect(state?.lore).toEqual(['origin-spark'])
  })

  it('глава возвращается, когда условие действительно выполнено', () => {
    const state = sanitizeState({
      version: STATE_VERSION,
      controlled: ['cap-core', 'cap-drift'],
      achievements: { 'sectors-10': 10 },
      lore: ['origin-spark', 'forge-cost'],
    })
    expect(state?.lore).toContain('forge-cost')
  })
})

/**
 * Надёжность сохранений: сжатие, автослоты и честный отказ записи.
 */
describe('сжатие кода партии', () => {
  it('сжатый код читается обратно', async () => {
    const state = midGame()
    const code = await encodeSaveCodeCompressed(state)
    const result = await decodeSaveCodeAsync(code)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.cycle).toBe(state.cycle)
  })

  it('сжатие заметно короче обычного кода', async () => {
    // Ради этого всё и затевалось: прокачанная партия не влезала в предел
    // облака Telegram, из-за чего понадобилась запись по частям.
    const state = midGame()
    const plain = encodeSaveCode(state)
    const compressed = await encodeSaveCodeCompressed(state)
    if (!isCompressionAvailable()) return
    expect(isCompressed(compressed)).toBe(true)
    expect(compressed.length).toBeLessThan(plain.length * 0.6)
  })

  it('обычный код по-прежнему читается', async () => {
    const state = midGame()
    const result = await decodeSaveCodeAsync(encodeSaveCode(state))
    expect(result.ok).toBe(true)
  })

  it('синхронный разбор честно сообщает про сжатый код', async () => {
    if (!isCompressionAvailable()) return
    const code = await encodeSaveCodeCompressed(midGame())
    expect(decodeSaveCode(code)).toEqual({ ok: false, reason: 'compressed' })
  })

  it('мусор под видом сжатого кода не ломает игру', async () => {
    const result = await decodeSaveCodeAsync('HEMZ1-этонекод')
    expect(result.ok).toBe(false)
  })
})

describe('автослоты', () => {
  it('снимок делается не каждый цикл', () => {
    expect(shouldSnapshot(1)).toBe(false)
    expect(shouldSnapshot(5)).toBe(false)
    expect(shouldSnapshot(SLOT_INTERVAL)).toBe(true)
    expect(shouldSnapshot(SLOT_INTERVAL * 2)).toBe(true)
  })

  it('слоты покрывают разные моменты партии, а не три хода подряд', () => {
    // Индекс выбирается по номеру цикла, поэтому последовательные снимки
    // ложатся в разные слоты и старый не затирается сразу же.
    const indexOf = (cycle: number) => Math.floor(cycle / SLOT_INTERVAL) % SLOT_COUNT
    const used = new Set([
      indexOf(SLOT_INTERVAL),
      indexOf(SLOT_INTERVAL * 2),
      indexOf(SLOT_INTERVAL * 3),
    ])
    expect(used.size).toBe(SLOT_COUNT)
  })
})

describe('фазы переживают перезагрузку', () => {
  const reload = (state: GameState): GameState => {
    const result = fromUnknown(JSON.parse(serialize(state)))
    if (!result.ok) throw new Error('сейв не прочитался')
    return result.state
  }

  it('ждущее событие остаётся ждущим', () => {
    // Регресс: фаза 'event' отсутствовала в списке допустимых, поэтому любое
    // случайное событие пропадало при обновлении страницы — бесплатная
    // возможность переиграть неудачный бросок.
    const eventId = [...EVENT_BY_ID.keys()][0] as string
    const state: GameState = { ...newGame(7), phase: 'event', pendingEvent: eventId }
    const loaded = reload(state)
    expect(loaded.phase).toBe('event')
    expect(loaded.pendingEvent).toBe(eventId)
  })

  it('все фазы игры считаются допустимыми при загрузке', () => {
    const phases: Phase[] = ['mutation', 'command', 'combat', 'vault', 'event', 'collapsed']
    for (const phase of phases) {
      const raw = { ...(JSON.parse(serialize(newGame(3))) as Record<string, unknown>), phase }
      const loaded = sanitizeState(raw)
      expect(loaded, phase).not.toBeNull()
      // Фаза либо сохраняется, либо осознанно понижается до 'command'
      // правилами восстановления — но не из-за того, что её нет в списке.
      expect(['command', phase], phase).toContain(loaded?.phase)
    }
  })

  it('событие без своей фазы не остаётся висеть в состоянии', () => {
    const eventId = [...EVENT_BY_ID.keys()][0] as string
    const loaded = reload({ ...newGame(7), phase: 'command', pendingEvent: eventId })
    expect(loaded.pendingEvent).toBeNull()
  })
})
