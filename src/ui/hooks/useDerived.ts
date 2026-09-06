import { useMemo } from 'react'
import { derive } from '@/engine/selectors'
import type { DerivedStats, GameState } from '@/engine/types'

/** Производные характеристики считаются один раз на изменение состояния. */
export function useDerived(state: GameState): DerivedStats {
  return useMemo(() => derive(state), [state])
}
