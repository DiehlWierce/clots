import { reduce } from '@/engine/engine'
import { EVENT_BY_ID, getSector } from '@/engine/content'
import { canAfford } from '@/engine/selectors'
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

/**
 * Отвечает на событие первым доступным вариантом.
 *
 * Важно допускать варианты с боем: у некоторых событий оба ответа требуют
 * либо ресурсов, либо схватки, и «безопасного» варианта просто нет. Помощник,
 * отбрасывавший бои, зацикливался на таком событии.
 */
export function answerEvent(state: GameState): GameState {
  if (state.phase !== 'event' || !state.pendingEvent) return state
  const event = EVENT_BY_ID.get(state.pendingEvent)
  const option =
    event?.options.find(o => !o.requires || canAfford(state, o.requires)) ?? event?.options[0]
  if (!option) return state
  return reduce(state, { type: 'event/choose', optionId: option.id }).state
}

/** Прокручивает партию до указанного цикла, доигрывая всё, что прерывает ход. */
export function advanceCycles(state: GameState, targetCycle: number, keepAlive = true): GameState {
  let s = state
  for (let i = 0; i < targetCycle * 8 && s.cycle < targetCycle; i += 1) {
    if (s.phase === 'combat') {
      s = reduce(s, { type: 'combat/withdraw' }).state
      continue
    }
    if (s.phase === 'event') {
      s = answerEvent(s)
      continue
    }
    if (s.phase === 'vault' && s.pendingVault) {
      const option = getSector(s.pendingVault)?.cache?.[0]
      if (option) s = reduce(s, { type: 'vault/choose', optionId: option.id }).state
      continue
    }
    if (s.phase !== 'command') break
    if (keepAlive) s = { ...s, integrity: 9999 }
    s = reduce(s, { type: 'cycle/end' }).state
  }
  return s
}
