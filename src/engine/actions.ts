import type { PlayerCombatAction } from './types'

/** Все действия, которые движок принимает извне. Больше входных точек нет. */
export type GameAction =
  // Действия командного экрана
  | { type: 'action/harvest' }
  | { type: 'action/refine' }
  | { type: 'action/transmute' }
  | { type: 'action/mask' }
  | { type: 'action/scan' }
  | { type: 'action/mend' }
  // Карта
  | { type: 'map/select'; sectorId: string }
  | { type: 'map/capture'; sectorId: string }
  // Бой
  | { type: 'combat/act'; action: PlayerCombatAction }
  | { type: 'combat/withdraw' }
  // Хранилище
  | { type: 'vault/choose'; optionId: string }
  // Стартовая мутация
  | { type: 'mutation/choose'; id: string }
  // Развитие
  | { type: 'module/buy'; id: string }
  | { type: 'doctrine/buy'; id: string }
  | { type: 'tech/buy'; id: string }
  // Цикл и служебное
  | { type: 'cycle/end' }
  | { type: 'tutorial/dismiss' }
  | { type: 'game/reset'; seed: number }
