import { create } from 'zustand'
import { haptics } from '@/telegram'
import { reduce } from '@/engine/engine'
import { createSeed } from '@/engine/rng'
import { clearPersisted, loadPersisted, persist } from '@/engine/save'
import { createInitialState } from '@/engine/state'
import type { GameAction } from '@/engine/actions'
import type { GameState } from '@/engine/types'
import type { Notice } from '@/engine/engine'

export interface Toast extends Notice {
  id: number
}

interface GameStore {
  state: GameState
  toasts: Toast[]
  dispatch: (action: GameAction) => void
  restart: () => void
  newGamePlus: () => void
  loadState: (state: GameState) => void
  dismissToast: (id: number) => void
}

/**
 * Запись в localStorage отложена до простоя браузера и склеивается: игра
 * пошаговая, поэтому сохранять чаще, чем раз в кадр, незачем. В v1 полное
 * состояние сериализовалось каждую секунду из setInterval.
 */
const schedulePersist = (() => {
  let pending: GameState | null = null
  let scheduled = false

  const flush = () => {
    scheduled = false
    if (pending) {
      persist(pending)
      pending = null
    }
  }

  return (state: GameState) => {
    pending = state
    if (scheduled) return
    scheduled = true
    if (typeof requestIdleCallback === 'function') requestIdleCallback(flush, { timeout: 500 })
    else setTimeout(flush, 200)
  }
})()

let toastId = 0

/**
 * Тактильный отклик выводится из результата действия, а не расставляется по
 * компонентам: так вибрация одинаково срабатывает и на клик, и на любое
 * будущее действие, и не может разойтись с тем, что реально произошло.
 */
function reportHaptics(before: GameState, after: GameState, notices: Notice[]): void {
  if (notices.some(n => n.tone === 'bad')) {
    haptics.error()
    return
  }

  // Урон по цитадели ощущается отдельно от результата хода.
  if (after.integrity < before.integrity) haptics.damage()

  if (notices.some(n => n.tone === 'good')) {
    haptics.success()
    return
  }

  // Бой: удар отзывается сильнее, добивание — как успех.
  if (before.combat && after.combat && after.combat.hp < before.combat.hp) {
    const share = (before.combat.hp - after.combat.hp) / Math.max(1, before.combat.maxHp)
    if (share > 0.18) haptics.crit()
    else haptics.hit()
    return
  }
  if (before.combat && !after.combat) {
    haptics.success()
    return
  }

  if (after.cycle > before.cycle) haptics.tap()
}

export const useGame = create<GameStore>((set, get) => ({
  state: loadPersisted() ?? createInitialState(createSeed()),
  toasts: [],

  dispatch: action => {
    const before = get().state
    const { state, notices } = reduce(before, action)
    schedulePersist(state)
    reportHaptics(before, state, notices)
    set(prev => ({
      state,
      toasts: [...prev.toasts, ...notices.map(notice => ({ ...notice, id: (toastId += 1) }))].slice(
        -4,
      ),
    }))
  },

  restart: () => {
    const seed = createSeed()
    clearPersisted()
    const state = createInitialState(seed)
    schedulePersist(state)
    set({ state, toasts: [] })
  },

  newGamePlus: () => {
    const seed = createSeed()
    const { state } = reduce(get().state, { type: 'game/newGamePlus', seed })
    schedulePersist(state)
    set({ state, toasts: [] })
  },

  loadState: state => {
    schedulePersist(state)
    set({ state, toasts: [{ id: (toastId += 1), message: 'Сохранение загружено.', tone: 'good' }] })
  },

  dismissToast: id => set(prev => ({ toasts: prev.toasts.filter(t => t.id !== id) })),
}))

/** Удобные точечные селекторы, чтобы компоненты не перерисовывались лишний раз. */
export const useGameState = () => useGame(s => s.state)
export const useDispatch = () => useGame(s => s.dispatch)
