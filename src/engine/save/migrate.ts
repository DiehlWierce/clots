import { STATE_VERSION } from '../state'

/**
 * Миграции сейвов между версиями схемы.
 *
 * Каждая функция поднимает данные ровно на одну версию. Новая версия — новая
 * запись в MIGRATIONS, и старые сейвы продолжают открываться. Сейвы новее, чем
 * знает эта сборка, отклоняются: молча «понять» их нельзя.
 */
type Migration = (data: Record<string, unknown>) => Record<string, unknown>

const MIGRATIONS: Record<number, Migration> = {
  /**
   * v1 → v2: появились стартовые мутации.
   *
   * Партия, начатая до их появления, продолжается без мутации: заставлять
   * выбирать её в середине забега бессмысленно, а сломать сейв — тем более.
   */
  1: data => ({
    ...data,
    mutation: null,
    mutationOffer: [],
    stats: { ...(data.stats as object), sectorsLost: 0 },
    pendingEvent: null,
    lastEventCycle: 0,
    seenEvents: [],
    siegeCyclesLeft: 0,
    ngPlus: 0,
    version: 2,
  }),
}

export function migrate(input: unknown): Record<string, unknown> | null {
  if (typeof input !== 'object' || input === null) return null
  let data = input as Record<string, unknown>

  const version = typeof data.version === 'number' ? data.version : 0
  if (version > STATE_VERSION) return null
  if (version < 1) return null // сейвы первой версии игры несовместимы по смыслу

  let current = version
  while (current < STATE_VERSION) {
    const step = MIGRATIONS[current]
    if (!step) return null
    data = step(data)
    current += 1
  }

  return { ...data, version: STATE_VERSION }
}
