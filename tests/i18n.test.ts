import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { ru } from '@/i18n/ru'

/**
 * Словари: русский — эталон формы, английский обязан её повторять.
 * Тест ловит забытый перевод раньше, чем его увидит игрок.
 */
describe('словари интерфейса', () => {
  const sections = Object.keys(ru) as (keyof typeof ru)[]

  it('набор разделов совпадает', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
  })

  it('в каждом разделе совпадают ключи', () => {
    for (const section of sections) {
      expect(Object.keys(en[section]).sort(), `раздел ${section}`).toEqual(
        Object.keys(ru[section]).sort(),
      )
    }
  })

  it('ни одна строка не пустая', () => {
    for (const dict of [ru, en]) {
      for (const section of Object.values(dict)) {
        for (const [key, value] of Object.entries(section)) {
          expect(String(value).trim().length, `пустая строка ${key}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('английский действительно переведён, а не скопирован', () => {
    // Хотя бы половина строк должна отличаться — иначе перевода нет.
    let different = 0
    let total = 0
    for (const section of sections) {
      for (const key of Object.keys(ru[section])) {
        total += 1
        const a = (ru[section] as Record<string, string>)[key]
        const b = (en[section] as Record<string, string>)[key]
        if (a !== b) different += 1
      }
    }
    expect(different / total).toBeGreaterThan(0.5)
  })

  it('в английском словаре нет кириллицы', () => {
    for (const section of Object.values(en)) {
      for (const [key, value] of Object.entries(section)) {
        expect(/[а-яА-ЯёЁ]/.test(String(value)), `кириллица в ${key}`).toBe(false)
      }
    }
  })
})
