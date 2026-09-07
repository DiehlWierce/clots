import { SECTORS } from '../content'
import { derive } from '../selectors'
import { createInitialState } from '../state'
import { POLICIES, step } from './policies'
import type { PolicyId } from './policies'
import type { GameState } from '../types'

export interface RunResult {
  policy: PolicyId
  seed: number
  /** Чем закончился забег. */
  outcome: 'victory' | 'collapsed' | 'timeout'
  cycles: number
  sectors: number
  level: number
  battlesWon: number
  battlesLost: number
  raidsSurvived: number
  sectorsLost: number
  /** На каком секторе забег оборвался — подсказка, где игроки ломаются. */
  stoppedAt: string | null
  doctrinePath: string | null
  mutation: string | null
}

/**
 * Предел длины забега.
 *
 * Победа осторожной игрой приходит к 250-му циклу, поэтому предел ниже
 * трёхсот делал отчёт бессмысленным: партии обрывались до финала и
 * показывали нулевую долю побед у стиля, который на самом деле выигрывает.
 */
export const DEFAULT_MAX_CYCLES = 400

/** Один забег до конца или до предела циклов. */
export function simulateRun(
  policyId: PolicyId,
  seed: number,
  maxCycles = DEFAULT_MAX_CYCLES,
  /** Принудительная мутация: нужна, чтобы мерить их по отдельности. */
  forceMutation?: string,
  /** Номер прохождения: в NG+ действует растущее давление системы. */
  ngPlus = 0,
): RunResult {
  const policy = POLICIES[policyId]
  let s: GameState = createInitialState(seed)
  if (forceMutation) s = { ...s, mutationOffer: [forceMutation] }
  if (ngPlus > 0) s = { ...s, ngPlus }
  let guard = 0
  const limit = maxCycles * 40

  while (s.cycle <= maxCycles && s.phase !== 'collapsed' && s.phase !== 'victory') {
    guard += 1
    if (guard > limit) break
    const next = step(s, policy)
    // Политика не смогла сделать ход — принудительно завершаем цикл,
    // иначе симуляция зациклится на неразрешимом состоянии.
    if (next === s) {
      if (s.phase !== 'command') break
      s = step({ ...s, energy: 0 }, policy)
      continue
    }
    s = next
  }

  const frontier = SECTORS.find(sec => !s.controlled.includes(sec.id) && sec.garrison)

  return {
    policy: policyId,
    seed,
    outcome: s.phase === 'victory' ? 'victory' : s.phase === 'collapsed' ? 'collapsed' : 'timeout',
    cycles: s.cycle,
    sectors: s.controlled.length,
    level: derive(s).level,
    battlesWon: s.stats.battlesWon,
    battlesLost: s.stats.battlesLost,
    raidsSurvived: s.stats.raidsSurvived,
    sectorsLost: s.stats.sectorsLost,
    stoppedAt: s.phase === 'collapsed' ? (frontier?.id ?? null) : null,
    doctrinePath: s.doctrinePath,
    mutation: s.mutation,
  }
}

export interface PolicySummary {
  policy: PolicyId
  name: string
  runs: number
  victories: number
  collapses: number
  timeouts: number
  winRate: number
  medianCycles: number
  medianSectors: number
  medianLevel: number
  /** Сектор, на котором чаще всего обрывается забег. */
  commonWall: string | null
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0)
}

export function summarize(results: RunResult[]): PolicySummary {
  const first = results[0]
  const policy = first?.policy ?? 'aggressive'
  const victories = results.filter(r => r.outcome === 'victory').length
  const collapses = results.filter(r => r.outcome === 'collapsed').length

  const walls = new Map<string, number>()
  for (const r of results) {
    if (!r.stoppedAt) continue
    walls.set(r.stoppedAt, (walls.get(r.stoppedAt) ?? 0) + 1)
  }
  const commonWall = [...walls.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    policy,
    name: POLICIES[policy].name,
    runs: results.length,
    victories,
    collapses,
    timeouts: results.filter(r => r.outcome === 'timeout').length,
    winRate: results.length > 0 ? victories / results.length : 0,
    medianCycles: median(results.map(r => r.cycles)),
    medianSectors: median(results.map(r => r.sectors)),
    medianLevel: median(results.map(r => r.level)),
    commonWall,
  }
}

/** Прогон набора забегов по всем политикам. */
export function runSuite(runsPerPolicy: number, baseSeed = 1): Map<PolicyId, PolicySummary> {
  const out = new Map<PolicyId, PolicySummary>()
  for (const policyId of Object.keys(POLICIES) as PolicyId[]) {
    const results: RunResult[] = []
    for (let i = 0; i < runsPerPolicy; i += 1) {
      results.push(simulateRun(policyId, baseSeed + i * 7919))
    }
    out.set(policyId, summarize(results))
  }
  return out
}
