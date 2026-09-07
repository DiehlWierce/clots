import { levelForXp } from '../balance'
import { ALL_CHAPTERS } from '../content'
import { isAchievementEarned } from '../selectors'
import type { GameState, LoreUnlock } from '../types'

/**
 * Выполнено ли условие открытия главы.
 *
 * Правило живёт в одном месте и применяется дважды: при открытии главы по
 * ходу партии и при загрузке сейва. Второе обязательно — иначе глава,
 * открытая по ошибке в прошлой версии игры, остаётся в списке навсегда:
 * список хранится в сейве, а не вычисляется заново.
 */
export function isChapterUnlocked(state: GameState, unlock: LoreUnlock): boolean {
  switch (unlock.kind) {
    case 'always':
      return true
    case 'cycle':
      return state.cycle >= unlock.value
    case 'level':
      return levelForXp(state.xp) >= unlock.value
    case 'region':
      return state.regions.includes(unlock.value)
    case 'sector':
      return state.controlled.includes(unlock.value)
    case 'achievement':
      return isAchievementEarned(state, unlock.value)
  }
}

/**
 * Оставляет только те главы, условия которых действительно выполнены.
 *
 * Самолечение сейва: список приводится в соответствие с правилами при каждой
 * загрузке, поэтому ошибка прошлой версии не переживает обновление игры.
 */
export function pruneLore(state: GameState): string[] {
  return state.lore.filter(id => {
    const chapter = ALL_CHAPTERS.find(c => c.id === id)
    return chapter ? isChapterUnlocked(state, chapter.unlock) : false
  })
}

/** Главы, которые должны быть открыты в текущем состоянии. */
export function unlockedChapters(state: GameState): string[] {
  return ALL_CHAPTERS.filter(c => isChapterUnlocked(state, c.unlock)).map(c => c.id)
}
