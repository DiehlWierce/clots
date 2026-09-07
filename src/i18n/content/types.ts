/**
 * Перевод контента.
 *
 * Русский текст остаётся в src/engine/content и служит эталоном: движок
 * работает с идентификаторами и не знает про языки. Перевод — это отдельный
 * слой поверх, ключ в котором совпадает с id сущности. Отсутствующий перевод
 * не ломает игру: показывается исходная строка.
 */

/**
 * Псевдоним типа, а не интерфейс: у интерфейсов нет неявной индексной
 * сигнатуры, и они не подходят обобщённой функции доступа к переводу.
 */
export type NamedText = {
  name?: string
  description?: string
}

export type ContentPack = {
  sectors?: Record<string, NamedText>
  regions?: Record<string, NamedText & { subtitle?: string }>
  enemies?: Record<string, NamedText & { title?: string }>
  intents?: Record<string, NamedText & { label?: string }>
  modules?: Record<string, NamedText & { branch?: string }>
  doctrines?: Record<string, NamedText>
  doctrinePaths?: Record<string, NamedText & { motto?: string }>
  techs?: Record<string, NamedText & { branch?: string }>
  mutations?: Record<string, NamedText & { tagline?: string }>
  achievements?: Record<string, NamedText & { title?: string }>
  events?: Record<string, NamedText & { title?: string; text?: string }>
  eventOptions?: Record<string, { label?: string; outcome?: string }>
  epochs?: Record<string, NamedText>
  epochNames?: Record<string, string>
  sectorTypes?: Record<string, string>
  vaultOptions?: Record<string, { label?: string; description?: string }>
  loreEras?: Record<string, NamedText & { title?: string; period?: string; summary?: string }>
  loreChapters?: Record<string, { title?: string; paragraphs?: string[] }>
}
