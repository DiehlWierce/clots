import { describe, expect, it } from 'vitest'
import { reduce } from '@/engine/engine'
import { createInitialState } from '@/engine/state'
import { derive } from '@/engine/selectors'
import { currentIntent, effectiveArmor } from '@/engine/systems/combat'
import { BALANCE } from '@/engine/balance'
import type { GameState } from '@/engine/types'

/** Готовит партию, стоящую в бою за сектор с гарнизоном. */
function inCombat(seed = 77): GameState {
  let s = { ...createInitialState(seed), energy: 60, clots: 500, plasma: 500 }
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
  })

  it('удар снимает здоровье врага', () => {
    const before = inCombat()
    const after = reduce(before, { type: 'combat/act', action: 'strike' }).state
    expect(after.combat?.hp ?? 0).toBeLessThan(before.combat?.hp ?? 0)
  })

  it('вскрытие снижает эффективную броню', () => {
    const before = inCombat()
    const after = reduce(before, { type: 'combat/act', action: 'rupture' }).state
    expect(after.combat).not.toBeNull()
    if (!before.combat || !after.combat) return
    expect(effectiveArmor(after.combat)).toBeLessThanOrEqual(effectiveArmor(before.combat))
  })

  it('щит снижает урон следующего хода врага', () => {
    const base = inCombat(9)
    const unguarded = reduce(base, { type: 'combat/act', action: 'strike' }).state
    const guarded = reduce(base, { type: 'combat/act', action: 'guard' }).state
    // Оба варианта пропускают ход врага, но со щитом урон меньше.
    const lossPlain = base.integrity - unguarded.integrity
    const lossGuarded = base.integrity - guarded.integrity
    expect(lossGuarded).toBeLessThanOrEqual(lossPlain)
  })

  it('фокус усиливает следующий удар', () => {
    const base = inCombat(11)
    const plain = reduce(base, { type: 'combat/act', action: 'strike' }).state
    let focused = reduce(base, { type: 'combat/act', action: 'focus' }).state
    expect(focused.combat?.focused).toBe(true)
    focused = reduce(focused, { type: 'combat/act', action: 'strike' }).state
    const plainDamage = (base.combat?.hp ?? 0) - (plain.combat?.hp ?? 0)
    const focusedDamage = (base.combat?.hp ?? 0) - (focused.combat?.hp ?? 0)
    expect(focusedDamage).toBeGreaterThan(plainDamage)
  })

  it('всплеск требует сгустков и не проходит без них', () => {
    let s = inCombat()
    s = { ...s, clots: 0 }
    const after = reduce(s, { type: 'combat/act', action: 'surge' }).state
    expect(after.energy).toBe(s.energy)
    expect(after.combat?.hp).toBe(s.combat?.hp)
  })

  it('победа в бою захватывает сектор', () => {
    let s = inCombat()
    s = { ...s, energy: 999, xp: 8000, modules: { 'hem-arsenal': 3, 'apex-lance': 3 } }
    for (let i = 0; i < 100 && s.phase === 'combat'; i += 1) {
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    expect(s.phase).not.toBe('combat')
    expect(s.controlled).toContain('cap-weave')
    expect(s.stats.battlesWon).toBeGreaterThan(0)
  })

  it('отступление из обычного боя возможно и повышает угрозу', () => {
    const before = inCombat()
    const after = reduce(before, { type: 'combat/withdraw' }).state
    expect(after.phase).toBe('command')
    expect(after.controlled).not.toContain('cap-weave')
    expect(after.threat).toBeGreaterThan(before.threat)
  })

  it('во время боя обычные действия заблокированы', () => {
    const before = inCombat()
    const { state: after, notices } = reduce(before, { type: 'action/harvest' })
    expect(after.plasma).toBe(before.plasma)
    expect(notices.some(n => n.message.includes('бой'))).toBe(true)
  })

  it('урон по цитадели никогда не отрицательный и не роняет её ниже нуля', () => {
    let s = { ...inCombat(3), integrity: 5 }
    for (let i = 0; i < 60 && s.phase === 'combat'; i += 1) {
      s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    }
    expect(s.integrity).toBeGreaterThanOrEqual(0)
  })

  it('минимальный урок урона — не меньше 1', () => {
    // Даже против брони выше атаки удар обязан что-то снимать,
    // иначе бой с «фалангой» становится бесконечным.
    let s = { ...inCombat(5), xp: 0, modules: {} }
    const stats = derive(s)
    expect(stats.attack).toBeGreaterThan(0)
    const before = s.combat?.hp ?? 0
    s = reduce(s, { type: 'combat/act', action: 'strike' }).state
    expect(s.combat?.hp ?? 0).toBeLessThan(before)
  })
})

describe('стоимость боевых действий', () => {
  it('бой не тратит энергию цикла', () => {
    // Иначе энергия кончается посреди схватки, а пополнить её нельзя:
    // завершение цикла во время боя запрещено. Живучий враг стал бы непобедим.
    const base = inCombat()
    for (const action of ['strike', 'focus', 'guard', 'rupture'] as const) {
      const after = reduce(base, { type: 'combat/act', action }).state
      expect(after.energy, `действие ${action} не должно тратить энергию`).toBe(base.energy)
    }
  })

  it('всплеск тратит только сгустки', () => {
    const base = inCombat()
    const after = reduce(base, { type: 'combat/act', action: 'surge' }).state
    expect(after.energy).toBe(base.energy)
    expect(after.clots).toBe(base.clots - BALANCE.combat.surge.cost.clots)
  })

  it('первый бой в игре выигрывается со стартовыми характеристиками', () => {
    // Регресс на баланс: гарнизон стартового региона обязан быть по силам
    // цитадели без единого улучшения.
    let s = createInitialState(31)
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
