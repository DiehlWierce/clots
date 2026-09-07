import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildErrorReport, clearErrors, listErrors, recordError } from '@/telegram/diagnostics'

/**
 * Сбор ошибок: он должен работать без внешних сервисов, не терять данные
 * игрока и никогда не падать сам — иначе от него больше вреда, чем пользы.
 */
describe('диагностика', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
  })

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('записывает ошибку и отдаёт свежие сверху', () => {
    recordError('первая')
    recordError('вторая')
    const errors = listErrors()
    expect(errors[0]?.message).toBe('вторая')
    expect(errors[1]?.message).toBe('первая')
  })

  it('хранит не больше десяти записей', () => {
    for (let i = 0; i < 25; i += 1) recordError(`ошибка ${i}`)
    expect(listErrors().length).toBe(10)
    // Остаются последние, а не первые: старые ошибки менее интересны.
    expect(listErrors()[0]?.message).toBe('ошибка 24')
  })

  it('длинное сообщение обрезается', () => {
    recordError('x'.repeat(1000))
    expect(listErrors()[0]?.message.length).toBeLessThanOrEqual(400)
  })

  it('очистка убирает всё', () => {
    recordError('ошибка')
    clearErrors()
    expect(listErrors()).toEqual([])
  })

  it('отчёт содержит технику и не содержит партии', () => {
    recordError('падение в бою', 'render')
    const report = buildErrorReport('ios', '2.0.0')
    expect(report).toContain('падение в бою')
    expect(report).toContain('ios')
    expect(report).toContain('2.0.0')
    // В отчёт не должно попадать состояние игры.
    expect(report).not.toContain('plasma')
  })

  it('пустой отчёт не собирается', () => {
    expect(buildErrorReport('ios', '2.0.0')).toBe('')
  })

  it('недоступное хранилище не роняет запись', () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('заблокировано')
      },
      setItem: () => {
        throw new Error('заблокировано')
      },
      removeItem: () => {},
    }
    expect(() => recordError('ошибка')).not.toThrow()
    expect(listErrors()).toEqual([])
  })
})
