import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { ru } from '@/i18n/ru'
import { createTranslator } from '@/i18n/content/translate'
import { CHAPTER_TEXT } from '@/engine/content/lore-text'
import enPack from '@/i18n/content/en'
import { contentPack, loadContentPack } from '@/i18n/content'
import {
  ACHIEVEMENTS,
  ALL_CHAPTERS,
  DOCTRINES,
  ENEMIES,
  EPOCH_MODIFIERS,
  EVENTS,
  MODULES,
  MUTATIONS,
  SECTORS,
  TECHS,
} from '@/engine/content'

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

/**
 * Перевод контента: русский текст в src/engine/content — эталон, английский
 * пакет накладывается поверх по идентификаторам. Непереведённая строка
 * остаётся русской, а не исчезает.
 */
describe('перевод контента', () => {
  // Пакет загружается динамически, поэтому в тесте берём его напрямую.
  const en = createTranslator(enPack)
  const ru = createTranslator({})

  it('русский пакет пуст и отдаёт исходный текст', () => {
    for (const sector of SECTORS) {
      expect(ru.sector(sector.id, 'name', sector.name)).toBe(sector.name)
    }
  })

  it('каждый сектор переведён', () => {
    for (const sector of SECTORS) {
      const name = en.sector(sector.id, 'name', sector.name)
      expect(name, `сектор ${sector.id}`).not.toBe(sector.name)
      expect(/[а-яА-ЯёЁ]/.test(name), `кириллица в ${sector.id}`).toBe(false)
    }
  })

  it('каждый враг переведён', () => {
    for (const enemy of ENEMIES) {
      expect(en.enemy(enemy.id, 'name', enemy.name), `враг ${enemy.id}`).not.toBe(enemy.name)
    }
  })

  it('каждый модуль, доктрина и технология переведены', () => {
    for (const item of MODULES) {
      expect(en.module(item.id, 'name', item.name), `модуль ${item.id}`).not.toBe(item.name)
    }
    for (const item of DOCTRINES) {
      expect(en.doctrine(item.id, 'name', item.name), `доктрина ${item.id}`).not.toBe(item.name)
    }
    for (const item of TECHS) {
      expect(en.tech(item.id, 'name', item.name), `технология ${item.id}`).not.toBe(item.name)
    }
  })

  it('каждая глава летописи переведена целиком', () => {
    for (const chapter of ALL_CHAPTERS) {
      const source = CHAPTER_TEXT[chapter.id]
      expect(source, `нет текста главы ${chapter.id}`).toBeDefined()
      if (!source) continue

      const title = en.loreChapterTitle(chapter.id, source.title)
      expect(title, `глава ${chapter.id}`).not.toBe(source.title)

      const paragraphs = en.loreChapterParagraphs(chapter.id, source.paragraphs)
      expect(paragraphs.length, `абзацы ${chapter.id}`).toBe(source.paragraphs.length)
      for (const text of paragraphs) {
        expect(/[а-яА-ЯёЁ]/.test(text), `кириллица в ${chapter.id}`).toBe(false)
      }
    }
  })

  it('каждое событие и его варианты переведены', () => {
    for (const event of EVENTS) {
      expect(en.event(event.id, 'title', event.title), `событие ${event.id}`).not.toBe(event.title)
      for (const option of event.options) {
        expect(
          en.eventOption(option.id, 'label', option.label),
          `вариант ${event.id}/${option.id}`,
        ).not.toBe(option.label)
      }
    }
  })

  it('каждая мутация, эпоха и достижение переведены', () => {
    for (const m of MUTATIONS) {
      expect(en.mutation(m.id, 'name', m.name), `мутация ${m.id}`).not.toBe(m.name)
    }
    for (const e of EPOCH_MODIFIERS) {
      expect(en.epoch(e.id, 'name', e.name), `эпоха ${e.id}`).not.toBe(e.name)
    }
    for (const a of ACHIEVEMENTS) {
      expect(en.achievement(a.id, 'title', a.title), `достижение ${a.id}`).not.toBe(a.title)
    }
  })

  it('неизвестный идентификатор отдаёт запасной текст', () => {
    expect(en.sector('нет-такого', 'name', 'запасной')).toBe('запасной')
  })
})

/**
 * Пакеты перевода загружаются по требованию: раньше оба языка лежали в
 * главном чанке, и русскоязычный игрок скачивал перевод, который не увидит.
 */
describe('загрузка пакетов перевода', () => {
  it('русский не требует загрузки и сразу пуст', () => {
    expect(contentPack('ru')).toEqual({})
  })

  it('незагруженный язык отдаёт пустой пакет, а не падает', () => {
    expect(contentPack('de')).toEqual({})
  })

  it('английский пакет загружается и кэшируется', async () => {
    const first = await loadContentPack('en')
    expect(first.sectors?.['cap-drift']?.name).toBe('Capillary Strait')
    // Второй вызов обязан вернуть тот же объект: повторная загрузка чанка
    // на каждое переключение языка сводила бы экономию на нет.
    expect(await loadContentPack('en')).toBe(first)
    expect(contentPack('en')).toBe(first)
  })

  it('неизвестный язык не пытается ничего грузить', async () => {
    expect(await loadContentPack('xx')).toEqual({})
  })
})
