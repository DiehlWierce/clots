import { enLore } from './en-lore'
import { enMisc } from './en-misc'
import { enProgression } from './en-progression'
import { enWorld } from './en-world'
import type { ContentPack } from './types'

/**
 * Английский пакет целиком.
 *
 * Отдельный модуль-точка входа: он загружается динамически и только тогда,
 * когда игрок выбрал английский. Раньше оба языка лежали в главном чанке,
 * и русскоязычный игрок скачивал перевод, который никогда не увидит.
 */
const en: ContentPack = { ...enWorld, ...enProgression, ...enMisc, ...enLore }

export default en
