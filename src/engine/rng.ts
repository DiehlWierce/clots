/**
 * Детерминированный ГСЧ (mulberry32).
 *
 * Игра обязана быть воспроизводимой: пара (seed, cursor) полностью определяет
 * любую случайность. Благодаря этому бои и рейды тестируются без моков,
 * а сейв не может «переиграть» неудачный бросок перезагрузкой страницы.
 */

export interface RngState {
  seed: number
  cursor: number
}

/** Возвращает число в [0, 1) для позиции cursor, не меняя состояние. */
export function rngAt(seed: number, cursor: number): number {
  let t = (seed + cursor * 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * Курсорный источник случайности. Мутирует переданный объект состояния,
 * поэтому вызывающий код всегда знает, сколько бросков было сделано.
 */
export class Rng {
  constructor(private readonly state: RngState) {}

  /** [0, 1) */
  next(): number {
    const value = rngAt(this.state.seed, this.state.cursor)
    this.state.cursor += 1
    return value
  }

  /** Целое в [min, max] включительно. */
  int(min: number, max: number): number {
    if (max <= min) return min
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Дробное в [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** true с вероятностью p. */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: пустой список')
    const item = items[this.int(0, items.length - 1)]
    if (item === undefined) throw new Error('Rng.pick: выход за границы')
    return item
  }
}

export function createSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
