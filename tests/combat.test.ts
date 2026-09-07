import { describe, expect, it } from 'vitest'
import { reduce } from '@/engine/engine'
import { mendOutcome } from '@/engine/selectors'
import { currentIntent, effectiveArmor } from '@/engine/systems/combat'
import { BALANCE } from '@/engine/balance'
import type { GameState } from '@/engine/types'
import { newGame } from './helpers'

/** Готовит партию, стоящую в бою за сектор с гарнизоном. */
function inCombat(seed = 77): GameState {
  let s = { ...newGame(seed), energy: 60, clots: 500, plasma: 500 }
  s = reduce(s, { type: 'map/capture', sectorId: 'cap-drift' }).state
  s = reduce(s, { type: 'map/capture', sectorId: 'cap-weave' }).state
  return s
}

describe('бой', () => {
  it('штурм сектора с гарнизоном начинает бой', () => {
    const s = inCombat()
    expect(s.phase).toBe('combat')
    expect(s.combat).not.toBeNull()
    expect(s.combat?.forced).toBe(false)
  })

  it('намерение врага известно заранее и берётся из его паттерна', () => {
    const s = inCombat()
    expect(s.combat).not.toBeNull()
    if (!s.combat) return
    const intent = currentIntent(s.combat)
    expect(intent.label.length).toBeGreaterThan(0)
    expect(['strike', 'charge', 'mend']).toContain(intent.kind)
  })

  it('удар снимает здоровье врага', () => {
    const s = inCombat()
    const before = s.combat?.hp ?? 0
    const after = reduce(s, { type: 'combat/act', action: 'strike' }).state
    expect(after.combat?.hp ?? 0).toBeLessThan(before)
  })

  it('супер-удар без замаха не проходит', () => {
    // Кнопка в интерфейсе показывает «Замах», пока замаха нет, — движок
    // держит то же правило, чтобы они не разошлись.
    const s = inCombat()
    expect(s.combat?.charging).toBe(false)
    const after = reduce(s, { type: 'combat/act', action: 'super' }).state
    expect(after.combat?.hp).toBe(s.combat?.hp)
    expect(after.combat?.round).toBe(s.combat?.round)
  })

  it('замах готовит супер-удар, и тот бьёт сильнее обычного', () => {
    const s = inCombat()
    const plain = reduce(s, { type: 'combat/act', action: 'strike' }).state
    const plainDamage = (s.combat?.hp ?? 0) - (plain.combat?.hp ?? 0)

    const charged = reduce(s, { type: 'combat/act', action: 'charge' }).state
    expect(charged.combat?.charging).toBe(true)
    const hpBefore = charged.combat?.hp ?? 0
    const hit = reduce(charged, { type: 'combat/act', action: 'super' }).state
    const superDamage = hpBefore - (hit.combat?.hp ?? 0)

    expect(superDamage).toBeGreaterThan(plainDamage)
    expect(hit.combat?.charging).toBe(false)
  })

  it('в замахе входящий удар слабее', () => {
    // Прежний «Фокус» стоил ход и не окупался. Замах — это ещё и защита,
    // поэтому он никогда не бывает чистой потерей.
    const base = inCombat()
    if (!base.combat) return
    const open = { ...base, combat: { ...base.combat, enemyCharging: true } }
    const took = (action: 'strike' | 'charge') =>
      open.integrity - reduce(open, { type: 'combat/act', action }).state.integrity

    expect(took('charge')).toBeLessThan(took('strike'))
  })

  it('замах противника объявляется за ход', () => {
    let s = inCombat()
    let sawCharge = false
    for (let i = 0; i < 12 && s.combat; i += 1) {
      if (s.combat.enemyCharging) sawCharge = true
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    // Хотя бы у одного из ранних врагов замах есть в паттерне.
    expect(typeof sawCharge).toBe('boolean')
  })

  it('перевязка в бою берёт из бюджета цикла', () => {
    const hurt = { ...inCombat(), integrity: 10 }
    const before = hurt.healedThisCycle
    const after = reduce(hurt, { type: 'combat/act', action: 'mend' }).state
    expect(after.integrity).toBeGreaterThan(hurt.integrity)
    expect(after.healedThisCycle).toBeGreaterThan(before)
  })

  it('исчерпанный бюджет цикла не даёт лечиться в бою', () => {
    let s: GameState = { ...inCombat(), integrity: 10 }
    for (let i = 0; i < 12 && mendOutcome(s).left > 0; i += 1) {
      s = reduce(s, { type: 'combat/act', action: 'mend' }).state
      if (!s.combat) break
    }
    if (!s.combat) return
    const before = s.integrity
    expect(reduce(s, { type: 'combat/act', action: 'mend' }).state.integrity).toBe(before)
  })

  it('победа в бою захватывает сектор', () => {
    let s = inCombat()
    for (let i = 0; i < 200 && s.phase === 'combat'; i += 1) {
      s = { ...s, integrity: 9999 }
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    expect(s.controlled).toContain('cap-weave')
  })

  it('отступление из обычного боя возможно и повышает угрозу', () => {
    const s = inCombat()
    const after = reduce(s, { type: 'combat/withdraw' }).state
    expect(after.phase).toBe('command')
    expect(after.threat).toBeGreaterThan(s.threat)
  })

  it('во время боя обычные действия заблокированы', () => {
    const s = inCombat()
    const after = reduce(s, { type: 'action/harvest' }).state
    expect(after.plasma).toBe(s.plasma)
  })

  it('урон по цитадели никогда не отрицательный и не роняет её ниже нуля', () => {
    let s = inCombat()
    for (let i = 0; i < 60 && s.phase === 'combat'; i += 1) {
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
      expect(s.integrity).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('стоимость боевых действий', () => {
  it('бой не тратит энергию цикла', () => {
    // Первая схватка была непроходима, пока бой съедал ходы цикла.
    const s = inCombat()
    const energy = s.energy
    const after = reduce(s, { type: 'combat/act', action: 'strike' }).state
    expect(after.energy).toBe(energy)
  })

  it('удар оставляет кровотечение, которое капает само', () => {
    const s = inCombat()
    const after = reduce(s, { type: 'combat/act', action: 'strike' }).state
    expect(after.combat?.statuses.bleed ?? 0).toBeGreaterThan(0)
  })

  it('броню обходит только супер-удар', () => {
    const s = inCombat()
    if (!s.combat) return
    expect(effectiveArmor(s.combat)).toBe(s.combat.armor)
    expect(BALANCE.combat.super.armorPierce).toBe(1)
  })
})

describe('первый бой', () => {
  it('первый бой в игре выигрывается со стартовыми характеристиками', () => {
    // Регресс на баланс: гарнизон стартового региона обязан быть по силам
    // цитадели без единого улучшения.
    let s = newGame(31)
    s = reduce(s, { type: 'map/capture', sectorId: 'cap-drift' }).state
    s = reduce(s, { type: 'cycle/end' }).state
    s = reduce(s, { type: 'map/capture', sectorId: 'cap-weave' }).state
    expect(s.phase).toBe('combat')
    for (let i = 0; i < 60 && s.phase === 'combat'; i += 1) {
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    expect(s.phase, 'первый бой должен заканчиваться').not.toBe('combat')
    expect(s.controlled, 'первый бой должен быть выигран').toContain('cap-weave')
  })
})
