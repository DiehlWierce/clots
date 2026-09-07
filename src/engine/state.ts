import { BALANCE } from './balance'
import { START_SECTOR, neighborsOf } from './content/sectors'
import { MUTATIONS, MUTATION_OFFER_SIZE } from './content/mutations'
import { Rng } from './rng'
import type { GameState } from './types'

/** Версия схемы состояния. Повышается при несовместимых изменениях — см. save/migrate.ts. */
export const STATE_VERSION = 2

/**
 * Три варианта мутации для стартового выбора.
 *
 * Набор выводится из зерна: одна и та же партия всегда предлагает одно и то же,
 * и результат воспроизводим по (seed, cursor), как и вся остальная случайность.
 */
export function rollMutationOffer(seed: number): string[] {
  const rng = new Rng({ seed, cursor: 0 })
  const pool = MUTATIONS.map(m => m.id)
  const offer: string[] = []
  while (offer.length < Math.min(MUTATION_OFFER_SIZE, pool.length)) {
    const pick = pool[rng.int(0, pool.length - 1)]
    if (pick && !offer.includes(pick)) offer.push(pick)
  }
  return offer
}

export function createInitialState(seed: number): GameState {
  const start = BALANCE.start
  return {
    version: STATE_VERSION,
    seed,
    rngCursor: 0,

    cycle: 1,
    // Партия начинается с выбора мутации, а не сразу с командного экрана.
    phase: 'mutation',

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

    mutation: null,
    mutationOffer: rollMutationOffer(seed),

    pendingEvent: null,
    lastEventCycle: 0,
    seenEvents: [],
    reliefUsed: 0,
    eventCycles: {},
    healedThisCycle: 0,
    overdrive: 0,

    siegeCyclesLeft: 0,
    ngPlus: 0,

    epoch: 0,
    epochModifiers: [],

    achievements: {},
    log: [
      {
        id: 1,
        cycle: 1,
        message: 'Поток сомкнулся не там, где обычно. Империя выбирает свою форму.',
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
      sectorsLost: 0,
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
