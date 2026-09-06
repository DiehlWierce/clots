import { describe, expect, it } from 'vitest'
import { Rng, rngAt } from '@/engine/rng'

describe('детерминированный ГСЧ', () => {
  it('одинаковые (seed, cursor) дают одинаковое число', () => {
    expect(rngAt(1234, 7)).toBe(rngAt(1234, 7))
    expect(rngAt(1234, 7)).not.toBe(rngAt(1234, 8))
  })

  it('последовательность воспроизводима', () => {
    const a = new Rng({ seed: 99, cursor: 0 })
    const b = new Rng({ seed: 99, cursor: 0 })
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('курсор продвигается на каждый бросок', () => {
    const state = { seed: 5, cursor: 0 }
    const rng = new Rng(state)
    rng.next()
    rng.int(1, 6)
    rng.chance(0.5)
    expect(state.cursor).toBe(3)
  })

  it('значения лежат в [0, 1)', () => {
    const rng = new Rng({ seed: 42, cursor: 0 })
    for (let i = 0; i < 2000; i += 1) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('int не выходит за границы', () => {
    const rng = new Rng({ seed: 7, cursor: 0 })
    for (let i = 0; i < 500; i += 1) {
      const value = rng.int(3, 9)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(9)
    }
  })
})
