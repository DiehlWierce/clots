import { produce } from 'immer'
import { BALANCE, levelForXp } from './balance'
import {
  ACHIEVEMENTS,
  ALL_CHAPTERS,
  DOCTRINE_BY_ID,
  EPOCH_MODIFIERS,
  EVENTS,
  EVENT_BY_ID,
  epochName,
  MODULE_BY_ID,
  MUTATION_BY_ID,
  REGIONS,
  SECTORS,
  TECH_BY_ID,
  getEnemy,
  getSector,
  neighborsOf,
} from './content'
import { Rng } from './rng'
import {
  canAfford,
  collectEffects,
  derive,
  mutationRaidPower,
  isSectorReachable,
  doctrineForkBlocked,
  epochMultiplier,
  nextCost,
  ngPlusPressure,
  overdriveCost,
  requirementsMet,
  VAULT_ENERGY,
  VAULT_INTEGRITY,
} from './selectors'
import { createInitialState } from './state'
import { isChapterUnlocked } from './systems/lore'
import {
  bleedDamage,
  createRaidCombat,
  createSectorCombat,
  currentIntent,
  momentumCost,
  momentumGain,
  resolveEnemyTurn,
  resolvePlayerHit,
} from './systems/combat'
import {
  clampThreat,
  pickRaider,
  pickReclaimTarget,
  raidChance,
  raidDifficulty,
  reclaimChance,
} from './systems/threat'
import type { GameAction } from './actions'
import type { GameState, LevelMap, PlayerCombatAction, ResourceBag, SectorDef } from './types'

/** Результат применения действия: новое состояние + что показать игроку. */
export interface ReduceResult {
  state: GameState
  /** Короткие сообщения для всплывающих уведомлений. */
  notices: Notice[]
}

export interface Notice {
  message: string
  tone: 'info' | 'good' | 'bad'
}

/**
 * Главная точка входа движка. Чистая функция: одинаковые (state, action)
 * всегда дают одинаковый результат, потому что вся случайность идёт через
 * детерминированный ГСЧ, привязанный к state.seed / state.rngCursor.
 */
export function reduce(state: GameState, action: GameAction): ReduceResult {
  const notices: Notice[] = []

  const next = produce(state, draft => {
    const ctx = createContext(draft, notices)

    if (action.type === 'game/reset') {
      return createInitialState(action.seed)
    }

    if (action.type === 'game/newGamePlus') {
      return startNewGamePlus(draft, action.seed)
    }

    // Пока идёт бой или ждёт выбора хранилище — остальные действия заблокированы.
    if (draft.phase === 'combat' && !action.type.startsWith('combat/')) {
      ctx.warn('Сначала завершите бой.')
      return
    }
    if (draft.phase === 'vault' && !action.type.startsWith('vault/')) {
      ctx.warn('Выберите содержимое хранилища.')
      return
    }
    if (draft.phase === 'event' && !action.type.startsWith('event/')) {
      ctx.warn('Сначала ответьте на событие.')
      return
    }
    // Пока не выбрана мутация, партия ещё не началась.
    if (draft.phase === 'mutation' && action.type !== 'mutation/choose') {
      ctx.warn('Сначала выберите мутацию империи.')
      return
    }
    // Партия окончена: сброс обработан выше, остальные действия игнорируются.
    if (draft.phase === 'collapsed' || draft.phase === 'victory') return

    switch (action.type) {
      case 'action/harvest':
        doHarvest(ctx)
        break
      case 'action/refine':
        doRefine(ctx)
        break
      case 'action/transmute':
        doTransmute(ctx)
        break
      case 'action/mask':
        doMask(ctx)
        break
      case 'action/scan':
        doScan(ctx)
        break
      case 'action/mend':
        doMend(ctx)
        break
      case 'map/select':
        if (getSector(action.sectorId)) draft.selectedSector = action.sectorId
        break
      case 'map/capture':
        doCapture(ctx, action.sectorId)
        break
      case 'combat/act':
        doCombatAction(ctx, action.action)
        break
      case 'combat/withdraw':
        doWithdraw(ctx)
        break
      case 'vault/choose':
        doVaultChoice(ctx, action.optionId)
        break
      case 'mutation/choose':
        doChooseMutation(ctx, action.id)
        break
      case 'event/choose':
        doEventChoice(ctx, action.optionId)
        break
      case 'module/buy':
        doBuyModule(ctx, action.id)
        break
      case 'doctrine/buy':
        doBuyDoctrine(ctx, action.id)
        break
      case 'tech/buy':
        doBuyTech(ctx, action.id)
        break
      case 'overdrive/buy':
        doOverdrive(ctx)
        break
      case 'cycle/end':
        doEndCycle(ctx)
        break
      case 'tutorial/dismiss':
        draft.tutorialDismissed = true
        break
    }

    syncDerived(ctx)
    return
  })

  return { state: next, notices }
}

/**
 * Новый забег с переносом части прогресса.
 *
 * Переносится половина уровней технологий — экономический задел, который
 * позволяет сразу играть в более сложную игру, — но не боевые модули и не
 * доктрины: путь выбирается заново, иначе следующий забег повторял бы
 * предыдущий. Гарнизоны и угроза становятся тяжелее с каждым прохождением.
 */
function startNewGamePlus(previous: GameState, seed: number): GameState {
  const fresh = createInitialState(seed)
  const carry = BALANCE.ngPlus.techCarry

  const techs: LevelMap = {}
  for (const [id, level] of Object.entries(previous.techs)) {
    const kept = Math.floor(level * carry)
    if (kept > 0) techs[id] = kept
  }

  return {
    ...fresh,
    ngPlus: previous.ngPlus + 1,
    techs,
    // Достижения — свойство игрока, а не забега: они не сбрасываются.
    achievements: { ...previous.achievements, 'second-cycle': 1 },
    lore: [...previous.lore],
    log: [
      {
        id: 1,
        cycle: 1,
        message: `Цикл ${previous.ngPlus + 2}-го порядка. Система помнит прошлую империю и готовилась.`,
        tone: 'info',
      },
    ],
  }
}

// ─── Контекст выполнения ────────────────────────────────────────────────────

interface Ctx {
  s: GameState
  rng: Rng
  notices: Notice[]
  log: (message: string, tone?: 'info' | 'good' | 'bad') => void
  warn: (message: string) => void
  good: (message: string) => void
}

function createContext(draft: GameState, notices: Notice[]): Ctx {
  const rng = new Rng({
    get seed() {
      return draft.seed
    },
    get cursor() {
      return draft.rngCursor
    },
    set cursor(value: number) {
      draft.rngCursor = value
    },
  })

  const log = (message: string, tone: 'info' | 'good' | 'bad' = 'info') => {
    draft.log.push({
      id: draft.log.length > 0 ? (draft.log[draft.log.length - 1]?.id ?? 0) + 1 : 1,
      cycle: draft.cycle,
      message,
      tone,
    })
    if (draft.log.length > BALANCE.log.limit) draft.log.shift()
  }

  return {
    s: draft,
    rng,
    notices,
    log,
    warn: message => {
      notices.push({ message, tone: 'bad' })
    },
    good: message => {
      notices.push({ message, tone: 'good' })
    },
  }
}

// ─── Общие помощники ────────────────────────────────────────────────────────

function spendEnergy(ctx: Ctx, amount: number): boolean {
  if (ctx.s.energy < amount) {
    ctx.warn(`Нужно ⚡${amount}, а есть ⚡${ctx.s.energy}. Завершите цикл.`)
    return false
  }
  ctx.s.energy -= amount
  return true
}

function payCost(ctx: Ctx, cost: ResourceBag): boolean {
  if (!canAfford(ctx.s, cost)) {
    ctx.warn('Недостаточно ресурсов.')
    return false
  }
  ctx.s.plasma -= cost.plasma ?? 0
  ctx.s.clots -= cost.clots ?? 0
  ctx.s.essence -= cost.essence ?? 0
  return true
}

function grant(ctx: Ctx, bag: ResourceBag & { xp?: number }): void {
  const stats = derive(ctx.s)
  if (bag.plasma) {
    const value = Math.round(bag.plasma * (1 + stats.plasmaYield))
    ctx.s.plasma += value
    ctx.s.stats.plasmaEarned += value
  }
  if (bag.clots) {
    const value = Math.round(bag.clots * (1 + stats.clotYield))
    ctx.s.clots += value
    ctx.s.stats.clotsEarned += value
  }
  if (bag.essence) {
    const value = Math.round(bag.essence * (1 + stats.essenceYield))
    ctx.s.essence += value
    ctx.s.stats.essenceEarned += value
  }
  if (bag.xp) gainXp(ctx, bag.xp)
}

function gainXp(ctx: Ctx, amount: number): void {
  const stats = derive(ctx.s)
  const before = levelForXp(ctx.s.xp)
  ctx.s.xp += Math.round(amount * (1 + stats.xpYield))
  const after = levelForXp(ctx.s.xp)
  if (after > before) {
    const healed = BALANCE.progression.levelUpHeal * (after - before)
    ctx.s.integrity += healed
    ctx.log(`Цитадель вышла на уровень ${after}. Целостность +${healed}.`, 'good')
    ctx.good(`Уровень ${after}`)
  }
}

function damageCitadel(ctx: Ctx, amount: number): void {
  const value = Math.max(0, Math.round(amount))
  ctx.s.integrity = Math.max(0, ctx.s.integrity - value)
  ctx.s.stats.damageTaken += value
}

/** Приводит производные величины к границам и проверяет условия конца партии. */
function syncDerived(ctx: Ctx): void {
  const s = ctx.s
  const stats = derive(s)

  s.plasma = Math.max(0, Math.round(s.plasma))
  s.clots = Math.max(0, Math.round(s.clots))
  s.essence = Math.max(0, Math.round(s.essence))
  s.energy = Math.max(0, Math.min(stats.maxEnergy, Math.round(s.energy)))
  s.integrity = Math.max(0, Math.min(stats.maxIntegrity, Math.round(s.integrity)))
  s.threat = clampThreat(Math.round(s.threat * 10) / 10)
  s.masking = Math.max(0, Math.min(BALANCE.masking.max, Math.round(s.masking * 10) / 10))
  s.xp = Math.max(0, Math.round(s.xp))

  checkAchievements(ctx, stats.level)
  unlockLore(ctx)

  if (s.integrity <= 0 && s.phase !== 'collapsed') {
    s.phase = 'collapsed'
    s.combat = null
    s.pendingVault = null
    ctx.log('Ядро не выдержало. Империя рассыпается по руслам.', 'bad')
  }
}

// ─── Действия командного экрана ─────────────────────────────────────────────

function doHarvest(ctx: Ctx): void {
  const cfg = BALANCE.actions.harvest
  if (!spendEnergy(ctx, cfg.energy)) return
  const stats = derive(ctx.s)
  const gained = Math.round(cfg.gain * (1 + stats.plasmaYield))
  ctx.s.plasma += gained
  ctx.s.stats.plasmaEarned += gained
  gainXp(ctx, BALANCE.xp.harvest)
  ctx.log(`Сбор плазмы: +${gained}.`)
  unlock(ctx, 'first-blood')
  advanceTutorial(ctx, 0)
}

function doRefine(ctx: Ctx): void {
  const cfg = BALANCE.actions.refine
  if (!spendEnergy(ctx, cfg.energy)) return
  if (!payCost(ctx, cfg.cost)) {
    ctx.s.energy += cfg.energy // энергия не сгорает, если действие не состоялось
    return
  }
  const stats = derive(ctx.s)
  const gained = Math.round(cfg.gain * (1 + stats.clotYield))
  ctx.s.clots += gained
  ctx.s.stats.clotsEarned += gained
  gainXp(ctx, BALANCE.xp.refine)
  ctx.log(`Синтез сгустков: +${gained}.`)
  unlock(ctx, 'first-blood')
  advanceTutorial(ctx, 1)
}

function doTransmute(ctx: Ctx): void {
  const cfg = BALANCE.actions.transmute
  if (!spendEnergy(ctx, cfg.energy)) return
  if (!payCost(ctx, cfg.cost)) {
    ctx.s.energy += cfg.energy
    return
  }
  const stats = derive(ctx.s)
  const gained = Math.round(cfg.gain * (1 + stats.essenceYield))
  ctx.s.essence += gained
  ctx.s.stats.essenceEarned += gained
  gainXp(ctx, BALANCE.xp.transmute)
  ctx.log(`Возгонка эссенции: +${gained}.`)
  unlock(ctx, 'first-blood')
}

function doMask(ctx: Ctx): void {
  const cfg = BALANCE.masking
  if (!spendEnergy(ctx, cfg.actionEnergy)) return
  if (!payCost(ctx, cfg.actionCost)) {
    ctx.s.energy += cfg.actionEnergy
    return
  }
  ctx.s.masking += cfg.actionGain
  ctx.log(`Маскировка усилена: +${cfg.actionGain}.`, 'good')
  unlock(ctx, 'first-blood')
}

function doScan(ctx: Ctx): void {
  const cfg = BALANCE.actions.scan
  if (!spendEnergy(ctx, cfg.energy)) return
  // Снижение угрозы ограничено бюджетом цикла: иначе поздняя энергия
  // позволяет сбить угрозу в ноль одним ходом. Разведка при этом остаётся
  // полезной и после исчерпания бюджета — она открывает карту.
  const room = Math.max(0, BALANCE.threat.reliefCapPerCycle - ctx.s.reliefUsed)
  const relief = Math.min(cfg.threatRelief, room)
  ctx.s.threat -= relief
  ctx.s.reliefUsed += relief
  const revealed = revealFrontier(ctx)
  const threatPart = relief > 0 ? `угроза −${relief}` : 'угроза не снижена: предел цикла исчерпан'
  ctx.log(
    revealed > 0
      ? `Разведка потока: ${threatPart}, новых секторов: ${revealed}.`
      : `Разведка потока: ${threatPart}.`,
  )
  unlock(ctx, 'first-blood')
}

function doMend(ctx: Ctx): void {
  const cfg = BALANCE.actions.mend
  const stats = derive(ctx.s)
  if (ctx.s.integrity >= stats.maxIntegrity) {
    ctx.warn('Целостность уже полная.')
    return
  }
  // Бюджет цикла: за один ход ядро восстанавливается не больше чем на долю
  // максимума. Иначе поздней энергии хватает, чтобы чинить его до полного
  // каждый ход, и урон перестаёт что-либо значить.
  const budget = Math.max(cfg.heal, Math.round(stats.maxIntegrity * cfg.cyclePerCycle))
  const room = budget - ctx.s.healedThisCycle
  if (room <= 0) {
    ctx.warn('Ядро больше не примет восстановление в этом цикле.')
    return
  }
  if (!spendEnergy(ctx, cfg.energy)) return
  if (!payCost(ctx, cfg.cost)) {
    ctx.s.energy += cfg.energy
    return
  }
  const perAction = Math.max(cfg.heal, Math.round(stats.maxIntegrity * cfg.healShare))
  const healed = Math.min(perAction, room, stats.maxIntegrity - ctx.s.integrity)
  ctx.s.integrity += healed
  ctx.s.healedThisCycle += healed
  ctx.log(`Ядро восстановлено: +${healed} целостности.`, 'good')
  unlock(ctx, 'first-blood')
}

// ─── Карта ──────────────────────────────────────────────────────────────────

/** Добавляет в разведанные всех соседей захваченных секторов. Возвращает число новых. */
function revealFrontier(ctx: Ctx): number {
  let added = 0
  for (const owned of ctx.s.controlled) {
    for (const neighbor of neighborsOf(owned)) {
      const sector = getSector(neighbor)
      if (!sector) continue
      if (!ctx.s.regions.includes(sector.region)) continue
      if (ctx.s.controlled.includes(neighbor)) continue
      if (ctx.s.revealed.includes(neighbor)) continue
      ctx.s.revealed.push(neighbor)
      added += 1
    }
  }
  return added
}

function doCapture(ctx: Ctx, sectorId: string): void {
  const sector = getSector(sectorId)
  if (!sector) return
  if (!isSectorReachable(ctx.s, sectorId)) {
    ctx.warn('Сектор недостижим: нужен соседний захваченный сектор.')
    return
  }

  if (sector.garrison) {
    const cfg = BALANCE.actions.assault
    if (!spendEnergy(ctx, cfg.energy)) return
    const combat = createSectorCombat(sectorId, ctx.rng, ctx.s.ngPlus)
    if (!combat) {
      ctx.warn('Гарнизон не найден.')
      ctx.s.energy += cfg.energy
      return
    }
    ctx.s.combat = combat
    ctx.s.phase = 'combat'
    const enemy = getEnemy(combat.enemyId)
    ctx.log(`Штурм «${sector.name}»: навстречу вышел ${enemy?.name ?? 'противник'}.`, 'bad')
    advanceTutorial(ctx, 3)
    return
  }

  const cfg = BALANCE.actions.occupy
  if (!spendEnergy(ctx, cfg.energy)) return
  completeCapture(ctx, sector)
}

/** Завершает захват: выдаёт награду, открывает регион, запускает хранилище/кузницу. */
function completeCapture(ctx: Ctx, sector: SectorDef): void {
  if (ctx.s.controlled.includes(sector.id)) return

  ctx.s.controlled.push(sector.id)
  ctx.s.revealed = ctx.s.revealed.filter(id => id !== sector.id)
  ctx.s.stats.sectorsTaken += 1

  if (sector.bounty) grant(ctx, sector.bounty)
  gainXp(ctx, BALANCE.xp.occupy)
  revealFrontier(ctx)

  ctx.log(`Сектор «${sector.name}» под контролем империи.`, 'good')
  ctx.good(`Захвачено: ${sector.name}`)
  unlock(ctx, 'first-sector')
  advanceTutorial(ctx, 2)

  if (sector.grantsModule) {
    const def = MODULE_BY_ID.get(sector.grantsModule)
    if (def && (ctx.s.modules[def.id] ?? 0) === 0) {
      ctx.s.modules[def.id] = 1
      ctx.log(`Из кузницы извлечён модуль «${def.name}».`, 'good')
      unlock(ctx, 'first-module')
    }
  }

  // Нексус открывает следующий регион.
  const nextRegion = REGIONS.find(r => r.unlockedBy === sector.id)
  if (nextRegion && !ctx.s.regions.includes(nextRegion.id)) {
    ctx.s.regions.push(nextRegion.id)
    revealFrontier(ctx)
    ctx.log(`Открыт регион: ${nextRegion.name}.`, 'good')
    ctx.good(`Новый регион: ${nextRegion.name}`)
    if (nextRegion.id === 'venous') unlock(ctx, 'region-venous')
    if (nextRegion.id === 'arterial') unlock(ctx, 'region-arterial')
    if (nextRegion.id === 'cortex') unlock(ctx, 'region-cortex')
  }

  if (sector.cache?.length) {
    ctx.s.pendingVault = sector.id
    ctx.s.phase = 'vault'
    return
  }

  if (sector.id === 'ctx-throne') {
    unlock(ctx, 'sovereign')
    // Осада взводится ровно один раз.
    //
    // Иммунитет может отбить трон, а игрок — взять его снова. Раньше этот
    // повторный захват выставлял счётчик заново, и осада начиналась с нуля
    // бесконечно: партия становилась непроходимой не по сложности, а по
    // устройству. Счётчик трогаем, только когда осады ещё нет.
    if (ctx.s.siegeCyclesLeft <= 0) {
      // Партия не заканчивается низложением Суверена: система переходит в
      // контрнаступление, и победа засчитывается только тем, кто его переживёт.
      ctx.s.siegeCyclesLeft = BALANCE.siege.cycles
      ctx.s.threat = clampThreat(Math.max(ctx.s.threat, 80))
      ctx.log(
        `Суверен Иммунис низложен, но система не признала поражения. Осада: продержитесь ${BALANCE.siege.cycles} циклов.`,
        'bad',
      )
      ctx.notices.push({ message: `Началась осада: ${BALANCE.siege.cycles} циклов`, tone: 'bad' })
    } else {
      ctx.log('Тронный синус отбит обратно. Осада продолжается.', 'good')
      ctx.notices.push({ message: 'Трон возвращён', tone: 'good' })
    }
    ctx.s.phase = 'command'
    return
  }

  ctx.s.phase = 'command'
}

function doVaultChoice(ctx: Ctx, optionId: string): void {
  const sectorId = ctx.s.pendingVault
  if (!sectorId) return
  const sector = getSector(sectorId)
  const option = sector?.cache?.find(o => o.id === optionId)
  if (!option) {
    ctx.warn('Такого варианта в хранилище нет.')
    return
  }

  const { integrity, maxEnergy, ...bag } = option.reward
  grant(ctx, bag)
  if (integrity) {
    // Постоянная прибавка к максимуму оформлена как «трофейный» модуль-невидимка:
    // хранится в modules, поэтому попадает в сейв и в расчёт характеристик.
    ctx.s.modules[VAULT_INTEGRITY] = (ctx.s.modules[VAULT_INTEGRITY] ?? 0) + integrity
    ctx.s.integrity += integrity
  }
  if (maxEnergy) {
    ctx.s.modules[VAULT_ENERGY] = (ctx.s.modules[VAULT_ENERGY] ?? 0) + maxEnergy
    ctx.s.energy += maxEnergy
  }

  ctx.s.pendingVault = null
  ctx.s.phase = 'command'
  ctx.log(`Хранилище вскрыто: ${option.label}.`, 'good')
}

function doChooseMutation(ctx: Ctx, id: string): void {
  if (ctx.s.mutation !== null) return
  if (!ctx.s.mutationOffer.includes(id)) {
    ctx.warn('Эта мутация не предлагалась.')
    return
  }
  const def = MUTATION_BY_ID.get(id)
  if (!def) return

  ctx.s.mutation = id
  ctx.s.phase = 'command'

  if (def.startBonus) {
    ctx.s.plasma += def.startBonus.plasma ?? 0
    ctx.s.clots += def.startBonus.clots ?? 0
    ctx.s.essence += def.startBonus.essence ?? 0
  }
  if (def.startThreat !== undefined) ctx.s.threat = def.startThreat

  // Прибавки к максимумам должны сразу отражаться на текущих значениях,
  // иначе мутация на целостность выглядит как «максимум вырос, а ядро нет».
  const stats = derive(ctx.s)
  ctx.s.integrity = Math.min(stats.maxIntegrity, Math.max(1, ctx.s.integrity))
  ctx.s.energy = stats.maxEnergy

  ctx.log(`Империя приняла форму: ${def.name}. ${def.tagline}.`, 'good')
  ctx.good(def.name)
}

// ─── Бой ────────────────────────────────────────────────────────────────────

function doCombatAction(ctx: Ctx, action: PlayerCombatAction): void {
  const combat = ctx.s.combat
  if (!combat) return
  const c = BALANCE.combat
  const stats = derive(ctx.s)

  // Импульс — плата за сильные приёмы. Он же делает «Фокус» и «Щит»
  // осмысленными: они не наносят урона, но копят ресурс на следующий удар.
  const cost = momentumCost(action)
  if (cost > 0 && combat.momentum < cost) {
    ctx.warn(`Нужно ${cost} импульса, накоплено ${combat.momentum}.`)
    return
  }

  if (action === 'surge' && !payCost(ctx, c.surge.cost)) return

  if (cost > 0) combat.momentum -= cost
  combat.momentum = Math.min(c.momentum.max, combat.momentum + momentumGain(action))

  if (action === 'focus') {
    combat.focused = true
    ctx.log(`Импульс сфокусирован: следующий удар тяжелее (+${c.momentum.perFocus} импульса).`)
    enemyTurn(ctx)
    return
  }

  if (action === 'guard') {
    combat.guarded = true
    ctx.log(`Щит поднят: удар придёт ослабленным (+${c.momentum.perGuard} импульса).`)
    enemyTurn(ctx)
    return
  }

  // Вскрытие срабатывает ДО расчёта урона: иначе его собственный удар гасился
  // бы щитом, который он в этот же момент срывает.
  if (action === 'rupture') {
    combat.armorBroken = Math.min(combat.armor, combat.armorBroken + c.rupture.armorBreak)
    const stripped = combat.shield
    combat.shield = 0
    combat.statuses.corrode += c.rupture.corrode
    const stunned = ctx.rng.chance(c.rupture.stunChance)
    if (stunned) combat.statuses.stun += 1
    ctx.log(
      `Вскрытие: ${[
        stripped > 0 ? `щит сорван (−${stripped})` : null,
        `броня ослаблена (−${c.rupture.armorBreak})`,
        `разъедание +${c.rupture.corrode}`,
        stunned ? 'противник оглушён' : null,
      ]
        .filter(Boolean)
        .join(', ')}.`,
    )
  }

  const hit = resolvePlayerHit(
    combat,
    stats,
    action,
    ctx.rng,
    epochMultiplier(ctx.s, 'combatDamage'),
  )

  if (hit.absorbed > 0) {
    combat.shield = Math.max(0, combat.shield - hit.absorbed)
  }
  combat.hp = Math.max(0, combat.hp - hit.damage)
  combat.focused = false
  ctx.s.stats.damageDealt += hit.damage

  // Пульс-удар оставляет кровотечение: урон продолжает капать сам.
  if (action === 'strike') combat.statuses.bleed = Math.max(combat.statuses.bleed, c.strike.bleed)

  const suffix = [hit.crit ? 'крит' : null, hit.weakness ? 'уязвимость' : null]
    .filter(Boolean)
    .join(', ')
  ctx.log(
    `${actionLabel(action)}: −${hit.damage}${suffix ? ` (${suffix})` : ''}${
      hit.absorbed > 0 ? `, щит поглотил ${hit.absorbed}` : ''
    }.`,
  )

  if (combat.hp <= 0) {
    winCombat(ctx)
    return
  }

  enemyTurn(ctx)
}

function actionLabel(action: string): string {
  switch (action) {
    case 'strike':
      return 'Пульс-удар'
    case 'surge':
      return 'Гемо-всплеск'
    case 'rupture':
      return 'Вскрытие'
    default:
      return 'Действие'
  }
}

function enemyTurn(ctx: Ctx): void {
  const combat = ctx.s.combat
  if (!combat) return
  const stats = derive(ctx.s)

  // Кровотечение капает до хода врага и может добить его само.
  if (combat.statuses.bleed > 0) {
    const damage = bleedDamage(stats)
    combat.hp = Math.max(0, combat.hp - damage)
    combat.statuses.bleed -= 1
    ctx.s.stats.damageDealt += damage
    ctx.log(`Кровотечение: −${damage}.`)
    if (combat.hp <= 0) {
      winCombat(ctx)
      return
    }
  }
  const result = resolveEnemyTurn(
    combat,
    stats,
    epochMultiplier(ctx.s, 'combatDamage'),
    epochMultiplier(ctx.s, 'enemyRegen'),
  )
  const enemy = getEnemy(combat.enemyId)

  if (result.damage > 0) damageCitadel(ctx, result.damage)
  if (result.energyDrained > 0) ctx.s.energy = Math.max(0, ctx.s.energy - result.energyDrained)
  if (result.healed > 0) combat.hp = Math.min(combat.maxHp, combat.hp + result.healed)
  if (result.shielded > 0) combat.shield += result.shielded
  ctx.s.threat += result.threat

  combat.guarded = false
  combat.round += 1
  if (result.stunned) {
    // Оглушённый враг теряет ход, но намерение не сменяется: игрок видит,
    // что именно он не успел применить.
    combat.statuses.stun -= 1
    ctx.log(`${enemy?.name ?? 'Противник'} оглушён и пропускает ход.`, 'good')
    return
  }
  combat.intentIndex += 1

  const parts = [
    result.damage > 0 ? `−${result.damage} целостности` : null,
    result.energyDrained > 0 ? `−⚡${result.energyDrained}` : null,
    result.healed > 0 ? `противник восстановил ${result.healed}` : null,
    result.shielded > 0 ? `щит +${result.shielded}` : null,
  ].filter(Boolean)

  ctx.log(
    `${enemy?.name ?? 'Противник'} — ${result.intent.label}${parts.length ? `: ${parts.join(', ')}` : '.'}`,
    result.damage > 0 ? 'bad' : 'info',
  )
}

function winCombat(ctx: Ctx): void {
  const combat = ctx.s.combat
  if (!combat) return
  const enemy = getEnemy(combat.enemyId)
  const wasRaid = combat.forced
  const sectorId = combat.sectorId
  const lowIntegrity = ctx.s.integrity < 10

  ctx.s.combat = null
  ctx.s.stats.battlesWon += 1
  ctx.s.stats.streak += 1
  ctx.s.stats.bestStreak = Math.max(ctx.s.stats.bestStreak, ctx.s.stats.streak)

  ctx.log(`${enemy?.name ?? 'Противник'} повержен.`, 'good')
  unlock(ctx, 'first-battle')
  if (lowIntegrity) unlock(ctx, 'brink')

  if (wasRaid) {
    // Отражённый рейд снимает угрозу из того же бюджета цикла, что и
    // разведка: иначе он снова становится обходным путём вокруг предела.
    const raidRoom = Math.max(0, BALANCE.threat.reliefCapPerCycle - ctx.s.reliefUsed)
    const raidRelief = Math.min(BALANCE.threat.raidRelief, raidRoom)
    ctx.s.threat -= raidRelief
    ctx.s.reliefUsed += raidRelief
    ctx.s.stats.raidsSurvived += 1
    gainXp(ctx, BALANCE.xp.raidWin)
    unlock(ctx, 'first-raid')
    ctx.log(`Рейд отражён. Угроза −${raidRelief}.`, 'good')
    ctx.good('Рейд отражён')
    ctx.s.phase = 'command'
    return
  }

  gainXp(ctx, BALANCE.xp.battleWin)
  const sector = getSector(sectorId)
  if (sector) {
    completeCapture(ctx, sector)
  } else {
    ctx.s.phase = 'command'
  }
  advanceTutorial(ctx, 3)
}

function doWithdraw(ctx: Ctx): void {
  const combat = ctx.s.combat
  if (!combat) return
  if (combat.forced) {
    // Рейд нельзя игнорировать: единственный выход — пропустить удар по ядру.
    ctx.s.combat = null
    ctx.s.phase = 'command'
    ctx.s.stats.battlesLost += 1
    ctx.s.stats.streak = 0
    damageCitadel(ctx, BALANCE.threat.raidBreachDamage)
    ctx.s.threat -= BALANCE.threat.raidRelief / 2
    ctx.log(`Рейд прорвался к ядру: −${BALANCE.threat.raidBreachDamage} целостности.`, 'bad')
    return
  }

  ctx.s.combat = null
  ctx.s.phase = 'command'
  ctx.s.stats.battlesLost += 1
  ctx.s.stats.streak = 0
  ctx.s.threat += BALANCE.combat.withdraw.threatPenalty
  ctx.log(`Отступление. Угроза +${BALANCE.combat.withdraw.threatPenalty}.`, 'bad')
}

// ─── Развитие ───────────────────────────────────────────────────────────────

function doBuyModule(ctx: Ctx, id: string): void {
  const def = MODULE_BY_ID.get(id)
  if (!def) return
  const level = ctx.s.modules[id] ?? 0
  if (level >= def.maxLevel) return
  if (!requirementsMet(ctx.s.modules, def.requires)) {
    ctx.warn('Сначала откройте предыдущий модуль ветки.')
    return
  }
  const cost = nextCost(def.costs, level)
  if (!cost || !payCost(ctx, cost)) return

  ctx.s.modules[id] = level + 1
  ctx.log(
    level === 0
      ? `Модуль «${def.name}» интегрирован.`
      : `Модуль «${def.name}» усилен до уровня ${level + 1}.`,
    'good',
  )
  unlock(ctx, 'first-module')
  if (level + 1 >= def.maxLevel) unlock(ctx, 'branch-max')
  advanceTutorial(ctx, 4)
}

function doBuyDoctrine(ctx: Ctx, id: string): void {
  const def = DOCTRINE_BY_ID.get(id)
  if (!def) return
  if (ctx.s.doctrinePath !== null && ctx.s.doctrinePath !== def.path) {
    ctx.warn('Путь уже выбран. Другие доктрины закрыты навсегда.')
    return
  }
  const level = ctx.s.doctrines[id] ?? 0
  if (level >= def.maxLevel) return
  if (doctrineForkBlocked(ctx.s, def)) {
    ctx.warn('На развилке уже выбрана другая доктрина.')
    return
  }
  if (!requirementsMet(ctx.s.doctrines, def.requires, def.requiresAny)) {
    ctx.warn('Сначала укрепите предыдущую доктрину пути.')
    return
  }
  const cost = nextCost(def.costs, level)
  if (!cost || !payCost(ctx, cost)) return

  ctx.s.doctrines[id] = level + 1
  if (ctx.s.doctrinePath === null) {
    ctx.s.doctrinePath = def.path
    ctx.log(`Путь империи определён: ${def.name}. Остальные пути закрыты.`, 'good')
  } else {
    ctx.log(`Доктрина «${def.name}» усилена до уровня ${level + 1}.`, 'good')
  }
  unlock(ctx, 'first-doctrine')
  if (level + 1 >= def.maxLevel) unlock(ctx, 'doctrine-max')
  advanceTutorial(ctx, 5)
}

/**
 * Перегрузка ядра.
 *
 * Единственная покупка без потолка: к концу партии дерево выкуплено, а
 * доход продолжает капать, и излишкам некуда деться. Цена растёт с каждым
 * уровнем, отдача — нет.
 */
function doOverdrive(ctx: Ctx): void {
  if (derive(ctx.s).level < BALANCE.overdrive.minLevel) return
  const cost = overdriveCost(ctx.s.overdrive)
  if (!payCost(ctx, cost)) return
  ctx.s.overdrive += 1
  gainXp(ctx, BALANCE.overdrive.xp)
  ctx.log(`Перегрузка ядра: уровень ${ctx.s.overdrive}.`, 'good')
  ctx.notices.push({ message: `Перегрузка ${ctx.s.overdrive}`, tone: 'good' })
}

function doBuyTech(ctx: Ctx, id: string): void {
  const def = TECH_BY_ID.get(id)
  if (!def) return
  const level = ctx.s.techs[id] ?? 0
  if (level >= def.maxLevel) return
  if (!requirementsMet(ctx.s.techs, def.requires)) {
    ctx.warn('Сначала откройте предыдущую технологию ветки.')
    return
  }
  const cost = nextCost(def.costs, level)
  if (!cost || !payCost(ctx, cost)) return

  ctx.s.techs[id] = level + 1
  ctx.log(`Технология «${def.name}» — уровень ${level + 1}.`, 'good')
  unlock(ctx, 'first-tech')
}

// ─── Цикл ───────────────────────────────────────────────────────────────────

function doEndCycle(ctx: Ctx): void {
  const s = ctx.s
  const stats = derive(s)

  s.cycle += 1

  // 1. Доход.
  s.plasma += stats.income.plasma
  s.clots += stats.income.clots
  s.essence += stats.income.essence
  s.stats.plasmaEarned += stats.income.plasma
  s.stats.clotsEarned += stats.income.clots
  s.stats.essenceEarned += stats.income.essence

  // 2. Регенерация ядра.
  if (stats.regen > 0) s.integrity = Math.min(stats.maxIntegrity, s.integrity + stats.regen)

  // 3. Маскировка: прирост от модулей минус естественная деградация.
  s.masking += stats.maskingGain - BALANCE.masking.decay

  // 4. Угроза. Во время осады давление резко возрастает.
  const siege = s.siegeCyclesLeft > 0
  s.threat = clampThreat(s.threat + stats.threatGain * (siege ? BALANCE.siege.threatMultiplier : 1))

  // Бюджет снижения угрозы обнуляется вместе с энергией: это ограничение
  // на ход, а не на партию.
  s.reliefUsed = 0
  s.healedThisCycle = 0

  // 5. Энергия восстанавливается полностью — цикл и есть «ход».
  s.energy = stats.maxEnergy

  ctx.log(
    `Цикл ${s.cycle}. Доход: +${stats.income.plasma}💧 +${stats.income.clots}🩸 +${stats.income.essence}✨. Угроза ${s.threat}%.`,
  )

  // 6. Иммунитет отбивает периферийный сектор, если угроза слишком высока.
  const pressure = siege ? BALANCE.siege.pressure : 1
  const reclaim = reclaimChance(s.threat) * pressure
  if (reclaim > 0 && ctx.rng.chance(reclaim)) {
    const lost = pickReclaimTarget(s, ctx.rng)
    if (lost) {
      const sector = getSector(lost)
      s.controlled = s.controlled.filter(id => id !== lost)
      // Сектор возвращается в разведанные: его можно отбить обратно.
      if (!s.revealed.includes(lost)) s.revealed.push(lost)
      // Потеря сектора снимает угрозу мимо бюджета цикла: это не выбор
      // игрока, а последствие, и оно должно стабилизировать империю, а не
      // добавлять к штрафу ещё и невозможность отдышаться.
      s.threat = clampThreat(s.threat - BALANCE.threat.reclaimRelief)
      s.stats.sectorsLost += 1
      ctx.log(`Иммунитет отбил сектор «${sector?.name ?? lost}». Доход упал.`, 'bad')
      ctx.notices.push({ message: `Потерян сектор: ${sector?.name ?? lost}`, tone: 'bad' })
    }
  }

  // 7. Проверка рейда.
  const chance = raidChance(s.threat) * pressure
  if (chance > 0 && ctx.rng.chance(chance)) {
    const raider = pickRaider(s.threat, s.regions.length, ctx.rng)
    if (raider) {
      const difficulty = Math.round(
        raidDifficulty(s.threat, stats.level, s.controlled.length) *
          mutationRaidPower(s) *
          pressure *
          // Рейду достаётся половина давления NG+: полное делало второе
          // прохождение непроходимым.
          (1 + (ngPlusPressure(s) - 1) * BALANCE.ngPlus.pressureRaidShare),
      )
      s.combat = createRaidCombat(raider, difficulty, ctx.rng)
      s.phase = 'combat'
      // Рейд урезает следующий ход: энергия уже начислена выше, и часть её
      // уходит на отражение. Сам бой при этом ходов не стоит.
      s.energy = Math.max(0, s.energy - BALANCE.combat.raidEnergyCost)
      ctx.log(`Иммунный рейд: ${raider.name} прорвался к цитадели.`, 'bad')
      ctx.notices.push({ message: `Рейд: ${raider.name}`, tone: 'bad' })
    }
  }

  // 8. Смена эпохи: система меняет правила до конца партии.
  advanceEpoch(ctx)

  // 9. Событие — только если цикл не занят боем: два оверлея подряд
  //    превращают ход в череду модальных окон.
  if (s.phase === 'command') rollEvent(ctx)

  // 10. Отсчёт осады. Выстоял — партия выиграна.
  if (siege) {
    s.siegeCyclesLeft -= 1
    if (s.siegeCyclesLeft <= 0) {
      s.phase = 'victory'
      unlock(ctx, 'siege-survivor')
      ctx.log('Осада выдержана. Система признала нового распорядителя.', 'good')
      ctx.notices.push({ message: 'Победа: осада выдержана', tone: 'good' })
    } else {
      ctx.log(`Осада: продержаться ещё ${s.siegeCyclesLeft} циклов.`, 'bad')
    }
  }

  if (s.cycle >= 50) unlock(ctx, 'cycle-50')
  advanceTutorial(ctx, 6)
}

/**
 * Переход в новую эпоху.
 *
 * Каждые BALANCE.epochs.length циклов добавляется глобальный модификатор,
 * который действует до конца партии и не отменяется. Модификаторы не
 * повторяются, поэтому поздняя игра постепенно становится другой игрой.
 */
function advanceEpoch(ctx: Ctx): void {
  const s = ctx.s
  const target = Math.floor((s.cycle - 1) / BALANCE.epochs.length)
  if (target <= s.epoch) return

  s.epoch = target
  const pool = EPOCH_MODIFIERS.filter(m => !s.epochModifiers.includes(m.id))
  if (pool.length === 0) return

  const picked = ctx.rng.pick(pool)
  s.epochModifiers.push(picked.id)
  ctx.log(`Наступила ${epochName(target)}. ${picked.name}: ${picked.description}`, 'bad')
  ctx.notices.push({ message: `${epochName(target)}: ${picked.name}`, tone: 'bad' })
}

// ─── События ────────────────────────────────────────────────────────────────

/** Подходит ли событие текущему состоянию партии. */
function eventAvailable(state: GameState, def: (typeof EVENTS)[number]): boolean {
  // Повторяемые события возвращаются после собственной паузы, остальные —
  // ровно один раз за партию. Без повторов пул вычерпывался к семидесятому
  // циклу, а победный забег длится втрое дольше.
  const last = state.eventCycles[def.id]
  if (def.repeatable) {
    const pause = def.repeatCooldown ?? BALANCE.events.repeatCooldown
    if (last !== undefined && state.cycle - last < pause) return false
  } else if (state.seenEvents.includes(def.id) || last !== undefined) {
    return false
  }
  if (def.minCycle !== undefined && state.cycle < def.minCycle) return false
  if (def.minSectors !== undefined && state.controlled.length < def.minSectors) return false
  if (def.minThreat !== undefined && state.threat < def.minThreat) return false
  if (def.minLevel !== undefined && derive(state).level < def.minLevel) return false
  return true
}

function rollEvent(ctx: Ctx): void {
  const s = ctx.s
  const cfg = BALANCE.events
  if (s.cycle - s.lastEventCycle < cfg.cooldown) return
  if (!ctx.rng.chance(cfg.chance)) return

  const pool = EVENTS.filter(def => eventAvailable(s, def))
  if (pool.length === 0) return

  const picked = ctx.rng.pick(pool)
  s.pendingEvent = picked.id
  s.lastEventCycle = s.cycle
  s.eventCycles[picked.id] = s.cycle
  s.phase = 'event'
  ctx.log(`Событие: ${picked.title}.`)
}

function doEventChoice(ctx: Ctx, optionId: string): void {
  const s = ctx.s
  const def = s.pendingEvent ? EVENT_BY_ID.get(s.pendingEvent) : undefined
  const option = def?.options.find(o => o.id === optionId)
  if (!def || !option) {
    ctx.warn('Такого варианта у события нет.')
    return
  }
  if (option.requires && !canAfford(s, option.requires)) {
    ctx.warn('Недостаточно ресурсов для этого варианта.')
    return
  }

  s.seenEvents.push(def.id)
  s.pendingEvent = null
  s.phase = 'command'

  // Ресурсы могут уходить в минус по замыслу варианта — списываем напрямую,
  // а не через grant, чтобы множители добычи не искажали цену решения.
  if (option.resources) {
    s.plasma += option.resources.plasma ?? 0
    s.clots += option.resources.clots ?? 0
    s.essence += option.resources.essence ?? 0
    if (option.resources.plasma && option.resources.plasma > 0) {
      s.stats.plasmaEarned += option.resources.plasma
    }
  }
  if (option.integrity) {
    if (option.integrity < 0) damageCitadel(ctx, -option.integrity)
    else s.integrity += option.integrity
  }
  if (option.energy) {
    // Прибавка к максимуму оформлена трофеем, как награды хранилищ.
    s.modules[VAULT_ENERGY] = (s.modules[VAULT_ENERGY] ?? 0) + option.energy
    s.energy += option.energy
  }
  if (option.threat) s.threat = clampThreat(s.threat + option.threat)
  if (option.masking) s.masking += option.masking
  if (option.xp) gainXp(ctx, option.xp)

  ctx.log(
    `${def.title}: ${option.label}. ${option.outcome}`,
    option.threat && option.threat > 0 ? 'bad' : 'good',
  )

  if (option.fight) {
    const enemy = getEnemy(option.fight)
    if (enemy) {
      const stats = derive(s)
      s.combat = createRaidCombat(enemy, Math.max(1, Math.round(stats.level * 0.8)), ctx.rng)
      s.phase = 'combat'
      ctx.log(`Столкновение: ${enemy.name}.`, 'bad')
    }
  }
}

// ─── Обучение, достижения, лор ──────────────────────────────────────────────

/**
 * Обучение — только подсказки. Оно никогда не блокирует интерфейс и не может
 * заблокировать перезапуск партии: шаг просто двигается вперёд по факту действия.
 */
function advanceTutorial(ctx: Ctx, step: number): void {
  if (ctx.s.tutorialDismissed) return
  if (ctx.s.tutorialStep === step) ctx.s.tutorialStep += 1
}

function unlock(ctx: Ctx, id: string): void {
  if ((ctx.s.achievements[id] ?? 0) > 0) return
  const def = ACHIEVEMENTS.find(a => a.id === id)
  if (!def) return
  ctx.s.achievements[id] = 1
  ctx.log(`Достижение: ${def.title}.`, 'good')
  ctx.good(`Достижение: ${def.title}`)
}

function progress(ctx: Ctx, id: string, value: number): void {
  const def = ACHIEVEMENTS.find(a => a.id === id)
  if (!def?.target) return
  if ((ctx.s.achievements[id] ?? 0) >= def.target) return
  if (value >= def.target) unlockWithTarget(ctx, id, def.target)
  else ctx.s.achievements[id] = Math.max(ctx.s.achievements[id] ?? 0, Math.floor(value))
}

function unlockWithTarget(ctx: Ctx, id: string, target: number): void {
  const already = (ctx.s.achievements[id] ?? 0) >= target
  ctx.s.achievements[id] = target
  if (already) return
  const def = ACHIEVEMENTS.find(a => a.id === id)
  if (!def) return
  ctx.log(`Достижение: ${def.title}.`, 'good')
  ctx.good(`Достижение: ${def.title}`)
}

function checkAchievements(ctx: Ctx, level: number): void {
  const s = ctx.s
  progress(ctx, 'sectors-10', s.controlled.length)
  progress(ctx, 'sectors-20', s.controlled.length)
  progress(ctx, 'sectors-all', s.controlled.length)
  progress(ctx, 'plasma-1000', s.plasma)
  progress(ctx, 'clots-500', s.clots)
  progress(ctx, 'essence-100', s.essence)
  progress(ctx, 'level-5', level)
  progress(ctx, 'level-10', level)
  progress(ctx, 'battles-10', s.stats.battlesWon)
  progress(ctx, 'battles-25', s.stats.battlesWon)
  progress(ctx, 'streak-5', s.stats.bestStreak)
  progress(ctx, 'cycle-50', s.cycle)

  const moduleCount = Object.entries(s.modules).filter(
    ([id, lvl]) => lvl > 0 && MODULE_BY_ID.has(id),
  ).length
  progress(ctx, 'modules-5', moduleCount)
  progress(ctx, 'modules-15', moduleCount)

  const techCount = Object.values(s.techs).filter(lvl => lvl > 0).length
  progress(ctx, 'tech-10', techCount)

  if (s.threat <= 0) unlock(ctx, 'calm')
  if (s.masking >= 90 && s.controlled.length >= 10) unlock(ctx, 'ghost')

  const region1 = SECTORS.filter(sec => sec.region === 'capillary')
  if (region1.every(sec => s.controlled.includes(sec.id)) && s.stats.battlesLost === 0) {
    unlock(ctx, 'pacifist-region')
  }
}

function unlockLore(ctx: Ctx): void {
  for (const chapter of ALL_CHAPTERS) {
    if (ctx.s.lore.includes(chapter.id)) continue
    if (!isChapterUnlocked(ctx.s, chapter.unlock)) continue
    ctx.s.lore.push(chapter.id)
    if (chapter.unlock.kind !== 'always') {
      // Название главы живёт в текстах, которые движок намеренно не знает:
      // они загружаются вместе с «Хроникой». Здесь достаточно номера.
      const index = ALL_CHAPTERS.findIndex(c => c.id === chapter.id) + 1
      ctx.log(`Летопись пополнилась: глава ${index} из ${ALL_CHAPTERS.length}.`, 'good')
    }
  }
}

// Реэкспорт для UI: удобнее импортировать всё из движка одной строкой.
export { currentIntent, collectEffects, derive }
