import { encodeSaveCode, decodeSaveCode } from './index'
import type { GameState } from '../types'

export const CLOUD_KEY = 'hem_save'

/**
 * Разрешение конфликта между локальной и облачной партией.
 *
 * Побеждает более поздняя — та, у которой больше цикл. Это единственный
 * критерий, который игрок может проверить сам: «на телефоне я дошёл до
 * двадцатого цикла, на компьютере до десятого — останется двадцатый».
 * При равенстве предпочитается локальная: она заведомо свежее по времени.
 */
export type SyncDecision = 'local' | 'cloud' | 'equal'

export function compareSaves(local: GameState | null, cloud: GameState | null): SyncDecision {
  if (!cloud) return 'local'
  if (!local) return 'cloud'
  if (cloud.cycle > local.cycle) return 'cloud'
  if (cloud.cycle < local.cycle) return 'local'
  return 'equal'
}

/** Сейв в виде строки для облака: тот же код, что игрок копирует руками. */
export function toCloudPayload(state: GameState): string {
  return encodeSaveCode(state)
}

export function fromCloudPayload(payload: string): GameState | null {
  const result = decodeSaveCode(payload)
  return result.ok ? result.state : null
}
