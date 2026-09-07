import { createInitialState } from '@/engine/state'
import type { GameState } from '@/engine/types'

/**
 * Партия, начатая сразу с командного экрана и без стартовой мутации.
 *
 * Настоящий забег открывается выбором мутации, но для тестов остальных систем
 * это лишний шаг, а любая мутация перекосила бы проверяемые числа. Сам выбор
 * проверяется отдельными тестами.
 */
export function newGame(seed: number): GameState {
  return { ...createInitialState(seed), phase: 'command', mutation: null }
}
