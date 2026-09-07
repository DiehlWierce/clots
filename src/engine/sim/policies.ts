import { BALANCE } from '../balance'
import {
  DOCTRINES as DOCTRINE_ORDER,
  EVENT_BY_ID,
  MODULES,
  SECTORS,
  TECHS,
  getSector,
} from '../content'
import { reduce } from '../engine'
import {
  canAfford,
  derive,
  doctrineForkBlocked,
  isSectorReachable,
  nextCost,
  overdriveCost,
  requirementsMet,
} from '../selectors'
import { currentIntent, momentumCost } from '../systems/combat'
import type { GameAction } from '../actions'
import type { DoctrinePath, GameState, SectorDef } from '../types'

/**
 * Политики игры для симуляции.
 *
 * Балансировка была занятием на глаз: любая правка чисел проверялась
 * ощущениями. Здесь описаны разные стили игры, чтобы измерять, а не
 * угадывать: что происходит с каждым подходом на одних и тех же зёрнах.
 *
 * Стили намеренно разведены до крайностей — измеряется не «средний игрок»,
 * а границы того, что игра допускает:
 *
 * - активные (агрессивная, экономическая, осторожная) — развиваются и
 *   расширяются, каждый по своему пути доктрин;
 * - накопительные (накопитель, крепость, гриндер) — откладывают выбор пути
 *   или не делают его вовсе, вкладываясь в дерево и ресурсы;
 * - крайности (берсерк, призрак, фермер рейдов, пацифист, стрела) — доводят
 *   одно решение до предела: не лечиться вовсе, не поднимать угрозу вовсе,
 *   жить рейдами, не воевать, идти только к трону;
 * - однобокие (технократ, инженер) — покупают только половину дерева.
 *
 * Если крайность выигрывает так же часто, как взвешенная игра, значит
 * соответствующая система на баланс не влияет.
 */

export type PolicyId =
  | 'aggressive'
  | 'economic'
  | 'cautious'
  | 'hoarder'
  | 'grinder'
  | 'fortress'
  | 'berserk'
  | 'ghost'
  | 'raider'
  | 'pacifist'
  | 'spear'
  | 'technocrat'
  | 'engineer'
  | 'medic'
  | 'reckless'
  | 'scout'
  | 'overdriver'
  | 'opportunist'
  | 'sprinter'
  | 'hermit'

/** Что стиль вообще покупает. */
export type BuyScope = 'all' | 'techs' | 'modules'

/**
 * Как выбирается следующий сектор.
 *
 * 'order' — в порядке контента, то есть по регионам подряд;
 * 'frontier' — самый сложный из доступных: движение к трону, а не вширь;
 * 'safest' — самый простой из доступных: расширение без риска.
 */
export type TargetOrder = 'order' | 'frontier' | 'safest'

export interface Policy {
  id: PolicyId
  name: string
  /** Порог угрозы, выше которого политика перестаёт расширяться. */
  expandBelowThreat: number
  /** Доля целостности, ниже которой политика не идёт в штурм. */
  assaultAboveHealth: number
  /** Доля целостности, до которой политика лечится. */
  healUpTo: number
  /** Предпочитаемый путь доктрин. */
  path: DoctrinePath
  /**
   * Цикл, раньше которого доктрины не покупаются. null — не покупаются
   * никогда: партия проходится на одних модулях и технологиях.
   */
  doctrineFrom: number | null
  /**
   * Расширяться не чаще, чем раз в столько циклов. 1 — без ограничения.
   *
   * Так описывается стиль «сначала скупить всё и укрепиться, потом
   * завоёвывать»: развитие идёт каждый цикл, захват — изредка, и почти весь
   * доход уходит в дерево, а не в новые секторы.
   *
   * Буквальный запрет расширяться до полного выкупа не работает: доход
   * берётся с территории, поэтому такой бот замирал на двух секторах и не
   * выигрывал ни разу. Это свойство игры, а не бота, — сказано в
   * docs/EXPERIENCE.md.
   */
  expandEvery: number
  /** Доля энергии, отдаваемая на переработку вместо добычи. */
  refineBias: number
  /**
   * На сколько сложность сектора может превышать уровень цитадели.
   * Живой игрок читает «сложность 10» на карточке и не лезет туда
   * с седьмым уровнем; без этого правила боты уходили в третий регион
   * недооснащёнными и гибли, ни разу не проиграв бой.
   */
  difficultyMargin: number
  /** Какую часть дерева стиль покупает. */
  buy: BuyScope
  /** Как выбирается следующий сектор. */
  target: TargetOrder
  /**
   * Не штурмовать сектора с гарнизоном и отступать из навязанных боёв.
   * Рейд отступлением не отменяется — он бьёт по ядру, — но пацифист
   * платит именно эту цену, а не дерётся.
   */
  avoidCombat: boolean
  /**
   * Не тратить ходы на маскировку вовсе.
   *
   * Отдельный рычаг, а не «высокий expandBelowThreat»: фермеру рейдов
   * угроза нужна, он живёт с неё, и путать это с безрассудством нельзя.
   */
  neverMask: boolean
  /**
   * Не лечиться вовсе.
   *
   * Замер показал, что лечение — единственный настоящий гейт выживания:
   * стиль, отличавшийся от агрессивного только отказом от лечения, погибал
   * на седьмом цикле в 50 забегах из 50. Рычаг нужен, чтобы проверять это
   * отдельно от отношения к угрозе.
   */
  neverHeal: boolean
  /**
   * Тратить излишки в перегрузку ядра, не дожидаясь выкупа дерева.
   * Проверяет, не оказывается ли бесконечный сток выгоднее самого дерева.
   */
  overdriveFirst: boolean
}

export const POLICIES: Record<PolicyId, Policy> = {
  aggressive: {
    id: 'aggressive',
    name: 'Агрессивная',
    // Порог держится ниже зоны рейдов: расширение «пока пускают» приводило
    // к постоянной угрозе 100% и гибели к пятнадцатому циклу. Агрессия —
    // это быстрый захват, а не отказ от управления угрозой.
    expandBelowThreat: 52,
    assaultAboveHealth: 0.65,
    healUpTo: 0.75,
    path: 'reaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.3,
    difficultyMargin: 2,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  economic: {
    id: 'economic',
    name: 'Экономическая',
    expandBelowThreat: 50,
    assaultAboveHealth: 0.8,
    healUpTo: 0.85,
    path: 'weaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.7,
    difficultyMargin: 0,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  cautious: {
    id: 'cautious',
    name: 'Осторожная',
    expandBelowThreat: 44,
    assaultAboveHealth: 0.9,
    healUpTo: 0.95,
    path: 'warden',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.5,
    difficultyMargin: -1,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  // Накопитель: сперва выкупает всё, что можно выкупить, и только глубоко
  // за середину партии определяется с путём. Проверяет, не наказывает ли
  // игра за отложенное решение сильнее, чем за неудачное.
  hoarder: {
    id: 'hoarder',
    name: 'Накопитель',
    expandBelowThreat: 42,
    assaultAboveHealth: 0.9,
    healUpTo: 0.9,
    path: 'weaver',
    doctrineFrom: 120,
    expandEvery: 1,
    refineBias: 0.85,
    difficultyMargin: -1,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  // Крепость: сначала скупает всё дерево и держит оборону — маскировка,
  // лечение, отбитые рейды, — и лишь потом идёт завоёвывать карту. Проверяет,
  // работает ли игра для того, кто сперва укрепляется, а потом наступает.
  fortress: {
    id: 'fortress',
    name: 'Крепость',
    expandBelowThreat: 46,
    assaultAboveHealth: 0.85,
    healUpTo: 0.95,
    path: 'warden',
    doctrineFrom: 1,
    expandEvery: 3,
    refineBias: 0.8,
    difficultyMargin: 0,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  // Гриндер: доктрину не берёт вовсе. Территория расширяется редко и только
  // наверняка. Это проверка на то, проходима ли игра без главного выбора —
  // и не оказывается ли отказ от него выгоднее самого выбора.
  grinder: {
    id: 'grinder',
    name: 'Гриндер',
    expandBelowThreat: 40,
    assaultAboveHealth: 0.92,
    healUpTo: 0.92,
    path: 'weaver',
    doctrineFrom: null,
    expandEvery: 1,
    refineBias: 0.75,
    difficultyMargin: -2,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  // ─── Крайности ────────────────────────────────────────────────────────────

  // Берсерк: угроза игнорируется полностью, лечение — только на грани смерти.
  // Прямая противоположность осторожной игре: проверяет, наказывает ли игра
  // за отказ от управления угрозой или это управление можно пропустить.
  berserk: {
    id: 'berserk',
    name: 'Берсерк',
    expandBelowThreat: 100,
    assaultAboveHealth: 0.15,
    healUpTo: 0.25,
    path: 'reaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.1,
    difficultyMargin: 2,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: true,
    neverHeal: false,
    overdriveFirst: false,
  },

  // Призрак: угроза держится у нуля любой ценой, расширение редкое и только
  // в самые простые сектора. Противоположность берсерку.
  ghost: {
    id: 'ghost',
    name: 'Призрак',
    expandBelowThreat: 18,
    assaultAboveHealth: 0.95,
    healUpTo: 0.98,
    path: 'warden',
    doctrineFrom: 1,
    expandEvery: 2,
    refineBias: 0.6,
    difficultyMargin: -2,
    buy: 'all',
    target: 'safest',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },

  // Фермер рейдов: угроза не сбивается намеренно — рейд даёт 45 опыта против
  // 12 за захват. Проверяет, выгоднее ли жить с рейдов, чем расширяться.
  raider: {
    id: 'raider',
    name: 'Фермер рейдов',
    expandBelowThreat: 100,
    assaultAboveHealth: 0.8,
    healUpTo: 0.95,
    path: 'reaver',
    doctrineFrom: 1,
    expandEvery: 6,
    refineBias: 0.6,
    difficultyMargin: 0,
    buy: 'all',
    target: 'safest',
    avoidCombat: false,
    neverMask: true,
    neverHeal: false,
    overdriveFirst: false,
  },

  // Пацифист: не штурмует гарнизоны и отступает из боёв. Берёт только пустые
  // сектора. Проверяет, проходима ли игра без боя вообще.
  pacifist: {
    id: 'pacifist',
    name: 'Пацифист',
    expandBelowThreat: 44,
    assaultAboveHealth: 0.9,
    healUpTo: 0.95,
    path: 'weaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.7,
    difficultyMargin: 0,
    buy: 'all',
    target: 'safest',
    avoidCombat: true,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },

  // Стрела: не расширяется вширь, а идёт к трону кратчайшим путём — каждый
  // раз берёт самый сложный доступный сектор. Проверяет, можно ли выиграть
  // малой территорией.
  spear: {
    id: 'spear',
    name: 'Стрела',
    expandBelowThreat: 55,
    assaultAboveHealth: 0.75,
    healUpTo: 0.8,
    path: 'reaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.4,
    difficultyMargin: 0,
    buy: 'all',
    target: 'frontier',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },

  // ─── Однобокие ────────────────────────────────────────────────────────────

  // Технократ покупает только технологии, инженер — только модули. Вместе они
  // отвечают на вопрос, какая половина дерева на самом деле решает партию.
  technocrat: {
    id: 'technocrat',
    name: 'Технократ',
    expandBelowThreat: 48,
    assaultAboveHealth: 0.85,
    healUpTo: 0.9,
    path: 'weaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.8,
    difficultyMargin: 0,
    buy: 'techs',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },

  engineer: {
    id: 'engineer',
    name: 'Инженер',
    expandBelowThreat: 48,
    assaultAboveHealth: 0.85,
    healUpTo: 0.9,
    path: 'warden',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.4,
    difficultyMargin: 0,
    buy: 'modules',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  // ─── Проверка отдельных систем ────────────────────────────────────────────

  // Медик: лечится до полного всегда и раньше всего остального. Замер
  // показал, что лечение — единственный настоящий гейт выживания; этот
  // стиль проверяет, достаточно ли одного лечения, чтобы дойти до конца.
  medic: {
    id: 'medic',
    name: 'Медик',
    expandBelowThreat: 50,
    assaultAboveHealth: 0.98,
    healUpTo: 1,
    path: 'warden',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.5,
    difficultyMargin: 0,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },

  // Безрассудный: не лечится вовсе, но угрозу держит. Пара к «Медику»:
  // вместе они разделяют вклад лечения и вклад управления угрозой, которые
  // у «Берсерка» были смешаны.
  reckless: {
    id: 'reckless',
    name: 'Безрассудный',
    expandBelowThreat: 46,
    assaultAboveHealth: 0.4,
    healUpTo: 0,
    path: 'reaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.3,
    difficultyMargin: 1,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: true,
    overdriveFirst: false,
  },

  // Разведчик: сбивает угрозу разведкой при первой возможности. Проверяет,
  // не стал ли новый предел снижения угрозы за цикл слишком мягким.
  scout: {
    id: 'scout',
    name: 'Разведчик',
    expandBelowThreat: 25,
    assaultAboveHealth: 0.8,
    healUpTo: 0.9,
    path: 'weaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.5,
    difficultyMargin: 0,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: true,
    neverHeal: false,
    overdriveFirst: false,
  },

  // Перегрузчик: топит излишки в бесконечный сток вместо дерева развития.
  // Проверяет, не оказалась ли перегрузка выгоднее обычных покупок.
  overdriver: {
    id: 'overdriver',
    name: 'Перегрузчик',
    expandBelowThreat: 48,
    assaultAboveHealth: 0.85,
    healUpTo: 0.9,
    path: 'reaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.5,
    difficultyMargin: 0,
    buy: 'all',
    target: 'order',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: true,
  },

  // Оппортунист: расширяется только в пустые сектора, но угрозу держит и
  // лечится. Мягкая версия пацифиста — проверяет, где именно проходит
  // граница между «не воевать вовсе» и «воевать только по необходимости».
  opportunist: {
    id: 'opportunist',
    name: 'Оппортунист',
    expandBelowThreat: 44,
    assaultAboveHealth: 0.95,
    healUpTo: 0.95,
    path: 'weaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.7,
    difficultyMargin: -1,
    buy: 'all',
    target: 'safest',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
  // ─── Проверка темпа ───────────────────────────────────────────────────────

  // Спринтер: берёт сектор при первой возможности, ничего не откладывая.
  // Пара к «Отшельнику»: вместе они меряют, сколько стоит время. Замер
  // показал, что медленный захват — доминирующая стратегия, и эти двое
  // держат крайние точки шкалы.
  sprinter: {
    id: 'sprinter',
    name: 'Спринтер',
    expandBelowThreat: 70,
    assaultAboveHealth: 0.5,
    healUpTo: 0.7,
    path: 'reaver',
    doctrineFrom: 1,
    expandEvery: 1,
    refineBias: 0.2,
    difficultyMargin: 1,
    buy: 'all',
    target: 'frontier',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },

  // Отшельник: захватывает раз в двенадцать циклов, всё остальное время
  // развивается. Крайняя точка «медленно — значит сильно».
  hermit: {
    id: 'hermit',
    name: 'Отшельник',
    expandBelowThreat: 40,
    assaultAboveHealth: 0.95,
    healUpTo: 0.95,
    path: 'warden',
    doctrineFrom: 1,
    expandEvery: 12,
    refineBias: 0.7,
    difficultyMargin: -1,
    buy: 'all',
    target: 'safest',
    avoidCombat: false,
    neverMask: false,
    neverHeal: false,
    overdriveFirst: false,
  },
}

/**
 * Уровень, на котором сектор такой сложности перестаёт быть авантюрой.
 *
 * Сложность секторов идёт до 17, а уровень цитадели — до 12: сравнивать их
 * напрямую нельзя. Правило «сложность не выше уровня» закрывало последние
 * сектора навсегда, и победа становилась недостижимой для всех политик
 * разом. Шкала сложности растягивается на шкалу уровней с запасом в два
 * уровня — чтобы осторожным стилям с отрицательным запасом хватало потолка.
 */
const MAX_DIFFICULTY = Math.max(...SECTORS.map(sec => sec.difficulty))
const FAIR_LEVEL_FOR_HARDEST = BALANCE.progression.xpCurve.length - 2

function recommendedLevel(difficulty: number): number {
  if (MAX_DIFFICULTY <= 0) return 1
  return 1 + (difficulty / MAX_DIFFICULTY) * (FAIR_LEVEL_FOR_HARDEST - 1)
}

/**
 * Пора ли этому стилю выходить на карту.
 *
 * Развитие в шаге бота и так идёт раньше захвата, поэтому «сначала покупки»
 * само по себе стиля не задаёт: как только на покупку не хватает, бот идёт
 * расширяться. Разницу делает темп — «Крепость» захватывает лишь раз в
 * несколько циклов, и накопленное уходит в дерево, а не в новые секторы.
 */
function readyToExpand(s: GameState, policy: Policy): boolean {
  if (policy.expandEvery <= 1) return true
  return s.cycle % policy.expandEvery === 0
}

/**
 * Следующий сектор для захвата.
 *
 * Порядок обхода — часть стиля, а не мелочь: «стрела» ломится к трону через
 * самый сложный доступный сектор, «призрак» и «пацифист» берут самый
 * простой, остальные идут в порядке контента, то есть по регионам подряд.
 */
function pickTarget(
  s: GameState,
  policy: Policy,
  withinReach: (difficulty: number) => boolean,
  healthy: boolean,
): SectorDef | undefined {
  const candidates = SECTORS.filter(sec => {
    if (!isSectorReachable(s, sec.id) || !withinReach(sec.difficulty)) return false
    // Пацифист не штурмует гарнизоны вовсе — только пустые сектора.
    if (policy.avoidCombat && sec.garrison) return false
    return healthy || !sec.garrison
  })
  if (candidates.length === 0) return undefined

  if (policy.target === 'frontier') {
    return candidates.reduce((best, sec) => (sec.difficulty > best.difficulty ? sec : best))
  }
  if (policy.target === 'safest') {
    return candidates.reduce((best, sec) => (sec.difficulty < best.difficulty ? sec : best))
  }
  return candidates[0]
}

const act = (state: GameState, action: GameAction): GameState => reduce(state, action).state

/**
 * Детерминированный «бросок» политики: зависит только от состояния партии,
 * поэтому один и тот же забег всегда воспроизводится по зерну.
 */
function decide(state: GameState, probability: number): boolean {
  const hash = (state.seed ^ (state.cycle * 2654435761) ^ (state.energy * 40503)) >>> 0
  return (hash % 1000) / 1000 < probability
}

/** Один ход бота: разрешает всё, что прерывает цикл, и делает один шаг. */
export function step(state: GameState, policy: Policy): GameState {
  const s = state

  if (s.phase === 'mutation') {
    const pick = s.mutationOffer[0]
    return pick ? act(s, { type: 'mutation/choose', id: pick }) : s
  }

  if (s.phase === 'combat' && s.combat) {
    // Пацифист не дерётся. Из навязанного рейда отступление стоит удара по
    // ядру — это и есть цена стиля, а не лазейка.
    if (policy.avoidCombat) return act(s, { type: 'combat/withdraw' })
    return fightStep(s, policy)
  }

  if (s.phase === 'event' && s.pendingEvent) {
    const event = EVENT_BY_ID.get(s.pendingEvent)
    const option =
      event?.options.find(o => !o.requires || canAfford(s, o.requires)) ?? event?.options[0]
    return option ? act(s, { type: 'event/choose', optionId: option.id }) : s
  }

  if (s.phase === 'vault' && s.pendingVault) {
    const option = getSector(s.pendingVault)?.cache?.[0]
    return option ? act(s, { type: 'vault/choose', optionId: option.id }) : s
  }

  if (s.phase !== 'command') return s

  const stats = derive(s)

  // Угроза под контролем — иначе рейды и потеря секторов съедают партию.
  // Берсерк и фермер рейдов этот шаг пропускают: одному угроза безразлична,
  // другому она нужна.
  if (!policy.neverMask && s.threat > policy.expandBelowThreat && s.energy >= 1) {
    // Инструменты разные, и путать их нельзя: маскировка замедляет прирост
    // угрозы, но саму угрозу не снижает — это делает разведка. Пока угроза
    // не подошла к зоне рейдов, выгоднее вкладываться в маскировку; когда
    // подошла — сбивать её напрямую. Раньше бот всегда маскировался и
    // измерял этим собственную ошибку, а не баланс игры.
    const needsRelief = s.threat >= BALANCE.threat.raidThreshold
    const canMask = s.masking < BALANCE.masking.max && s.plasma >= BALANCE.masking.actionCost.plasma
    if (!needsRelief && canMask) return act(s, { type: 'action/mask' })
    return act(s, { type: 'action/scan' })
  }

  // Лечение до порога политики. Когда угроза дошла до зоны рейдов, порог
  // поднимается почти до полного: рейд навязан и приходит в любой момент,
  // поэтому встречать его на половине целостности — не стиль игры, а ошибка.
  const healTarget =
    s.threat >= BALANCE.threat.raidThreshold ? Math.max(policy.healUpTo, 0.92) : policy.healUpTo
  if (
    !policy.neverHeal &&
    s.integrity < stats.maxIntegrity * healTarget &&
    s.energy >= BALANCE.actions.mend.energy &&
    s.plasma >= BALANCE.actions.mend.cost.plasma
  ) {
    return act(s, { type: 'action/mend' })
  }

  // Развитие: технологии, модули, доктрины выбранного пути.
  const purchase = pickPurchase(s, policy)
  if (purchase) return act(s, purchase)

  // Расширение.
  const healthy = s.integrity > stats.maxIntegrity * policy.assaultAboveHealth
  // Живой игрок читает «сложность 10» на карточке и не лезет туда с седьмым
  // уровнем. Правило было описано, но нигде не применялось: боты уходили
  // в третий регион недооснащёнными и гибли, ни разу не проиграв бой.
  const withinReach = (difficulty: number): boolean =>
    stats.level + policy.difficultyMargin >= recommendedLevel(difficulty)
  const target = readyToExpand(s, policy) ? pickTarget(s, policy, withinReach, healthy) : undefined
  if (target && s.energy >= BALANCE.actions.assault.energy) {
    return act(s, { type: 'map/capture', sectorId: target.id })
  }

  // Экономика: доля энергии на переработку, остальное на добычу.
  if (s.energy >= 1) {
    const wantRefine = s.plasma > BALANCE.actions.refine.cost.plasma * 3
    // Выбор между переработкой и добычей обязан быть детерминированным:
    // Math.random здесь ломал воспроизводимость симуляции по зерну.
    if (wantRefine && decide(s, policy.refineBias)) {
      return act(s, { type: 'action/refine' })
    }
    if (s.clots > BALANCE.actions.transmute.cost.clots * 3 && s.energy >= 2) {
      return act(s, { type: 'action/transmute' })
    }
    return act(s, { type: 'action/harvest' })
  }

  return act(s, { type: 'cycle/end' })
}

function pickPurchase(s: GameState, policy: Policy): GameAction | null {
  // Перегрузчик топит излишки в бесконечный сток раньше дерева развития.
  if (policy.overdriveFirst && canAfford(s, overdriveCost(s.overdrive))) {
    return { type: 'overdrive/buy' }
  }

  if (policy.buy !== 'modules') {
    for (const def of TECHS) {
      const level = s.techs[def.id] ?? 0
      if (level >= def.maxLevel) continue
      if (!requirementsMet(s.techs, def.requires)) continue
      const cost = nextCost(def.costs, level)
      if (cost && canAfford(s, cost)) return { type: 'tech/buy', id: def.id }
    }
  }
  if (policy.buy !== 'techs') {
    for (const def of MODULES) {
      const level = s.modules[def.id] ?? 0
      if (level >= def.maxLevel) continue
      if (!requirementsMet(s.modules, def.requires)) continue
      const cost = nextCost(def.costs, level)
      if (cost && canAfford(s, cost)) return { type: 'module/buy', id: def.id }
    }
  }
  // Перегрузка — последняя в очереди: она бесконечна, и покупать её раньше
  // обычного дерева значит топить излишки вместо развития.
  // Проверяется после доктрин, ниже.

  // Доктрины покупаются только когда стиль до них дозрел. Накопительные
  // политики держат путь незакрытым: у grinder — до конца партии.
  if (policy.doctrineFrom === null || s.cycle < policy.doctrineFrom) return null
  for (const def of DOCTRINE_ORDER) {
    if (def.path !== policy.path) continue
    if (s.doctrinePath !== null && s.doctrinePath !== def.path) continue
    if (doctrineForkBlocked(s, def)) continue
    const level = s.doctrines[def.id] ?? 0
    if (level >= def.maxLevel) continue
    if (!requirementsMet(s.doctrines, def.requires, def.requiresAny)) continue
    const cost = nextCost(def.costs, level)
    if (cost && canAfford(s, cost)) return { type: 'doctrine/buy', id: def.id }
  }

  // Излишкам поздней партии нужно назначение: когда покупать больше нечего,
  // ресурсы уходят в перегрузку, а не копятся мёртвым грузом.
  if (canAfford(s, overdriveCost(s.overdrive))) return { type: 'overdrive/buy' }

  return null
}

function fightStep(s: GameState, policy: Policy): GameState {
  const combat = s.combat
  if (!combat) return s
  const stats = derive(s)
  const intent = currentIntent(combat).kind
  const needsRupture = combat.shield > 0 || combat.armor - combat.armorBroken > 8

  if (needsRupture && combat.momentum >= momentumCost('rupture')) {
    return act(s, { type: 'combat/act', action: 'rupture' })
  }
  // Осторожная политика чаще уходит в защиту.
  const guardThreshold = policy.id === 'cautious' ? 0.7 : 0.4
  if (intent === 'heavy' && s.integrity < stats.maxIntegrity * guardThreshold) {
    return act(s, { type: 'combat/act', action: 'guard' })
  }
  if (
    combat.momentum >= momentumCost('surge') &&
    s.clots >= BALANCE.combat.surge.cost.clots &&
    !needsRupture
  ) {
    return act(s, { type: 'combat/act', action: 'surge' })
  }
  return act(s, { type: 'combat/act', action: 'strike' })
}
