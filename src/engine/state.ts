import { BALANCE } from './balance'
import { START_SECTOR, neighborsOf } from './content/sectors'
import type { GameState } from './types'

/** Версия схемы состояния. Повышается при несовместимых изменениях — см. save/migrate.ts. */
export const STATE_VERSION = 1

export function createInitialState(seed: number): GameState {
  const start = BALANCE.start
  return {
    version: STATE_VERSION,
    seed,
    rngCursor: 0,

    cycle: 1,
    phase: 'command',

    plasma: start.plasma,
    clots: start.clots,
    essence: start.essence,
    energy: start.energy,
    integrity: start.integrity,
    threat: start.threat,
    masking: start.masking,
    xp: 0,

    modules: {},
    doctrines: {},
    techs: {},
    doctrinePath: null,

    controlled: [START_SECTOR],
    revealed: [...neighborsOf(START_SECTOR)],
    regions: ['capillary'],
    selectedSector: neighborsOf(START_SECTOR)[0] ?? null,

    combat: null,
    pendingVault: null,

    achievements: {},
    log: [
      {
        id: 1,
        cycle: 1,
        message: 'Поток сомкнулся не там, где обычно. Империя начинается.',
        tone: 'info',
      },
    ],
    lore: [],

    tutorialStep: 0,
    tutorialDismissed: false,

    stats: {
      battlesWon: 0,
      battlesLost: 0,
      sectorsTaken: 0,
      raidsSurvived: 0,
      plasmaEarned: 0,
      clotsEarned: 0,
      essenceEarned: 0,
      damageDealt: 0,
      damageTaken: 0,
      bestStreak: 0,
      streak: 0,
    },
  }
}
