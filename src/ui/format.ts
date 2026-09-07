import type { CitadelEffects, ResourceBag, SectorType } from '@/engine/types'

export const RESOURCE_ICON = { plasma: '💧', clots: '🩸', essence: '✨' } as const

export function formatCost(cost: ResourceBag): string {
  const parts = [
    cost.plasma ? `💧${cost.plasma}` : null,
    cost.clots ? `🩸${cost.clots}` : null,
    cost.essence ? `✨${cost.essence}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join('  ') : 'бесплатно'
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}М`
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}К`
  return String(Math.round(value))
}

/** Какие эффекты показываются в процентах, а какие числом. */
const PERCENT_EFFECTS = new Set<keyof CitadelEffects>([
  'plasmaYield',
  'clotYield',
  'essenceYield',
  'suppression',
  'xpYield',
])

const EFFECT_ORDER: (keyof CitadelEffects)[] = [
  'attack',
  'defense',
  'maxIntegrity',
  'maxEnergy',
  'masking',
  'plasmaYield',
  'clotYield',
  'essenceYield',
  'suppression',
  'xpYield',
  'pierce',
  'regen',
  'logistics',
]

/**
 * Подписи эффектов приходят из словаря: они видны игроку и потому
 * локализуются, в отличие от идентификаторов.
 */
export function formatEffects(
  effects: CitadelEffects,
  labels: Record<string, string>,
  multiplier = 1,
): string[] {
  const out: string[] = []
  for (const key of EFFECT_ORDER) {
    const config = { label: labels[key] ?? key, percent: PERCENT_EFFECTS.has(key) }
    const value = effects[key]
    if (value === undefined || value === 0) continue
    const scaled = value * multiplier
    // Мутации дают и отрицательные модификаторы: знак ставим по значению.
    const sign = scaled < 0 ? '−' : '+'
    const magnitude = Math.abs(scaled)
    out.push(
      config.percent
        ? `${config.label} ${sign}${Math.round(magnitude * 100)}%`
        : `${config.label} ${sign}${Math.round(magnitude * 10) / 10}`,
    )
  }
  return out
}

export const SECTOR_TYPE_LABEL: Record<SectorType, string> = {
  harvest: 'Добыча',
  refinery: 'Переработка',
  sanctum: 'Санктум',
  relay: 'Ретранслятор',
  bastion: 'Бастион',
  vault: 'Хранилище',
  forge: 'Кузница',
  nexus: 'Нексус',
}

export const SECTOR_TYPE_ICON: Record<SectorType, string> = {
  harvest: '💧',
  refinery: '🩸',
  sanctum: '✨',
  relay: '⚡',
  bastion: '🛡️',
  vault: '🎁',
  forge: '🔨',
  nexus: '👑',
}

/** Общая форма «что даёт объект»: подходит и доходу сектора, и награде хранилища. */
export interface IncomeLike {
  plasma?: number
  clots?: number
  essence?: number
  energy?: number
  maxEnergy?: number
  defense?: number
  integrity?: number
  suppression?: number
  xp?: number
}

const INCOME_ICONS: [keyof IncomeLike, string][] = [
  ['plasma', '💧'],
  ['clots', '🩸'],
  ['essence', '✨'],
  ['energy', '⚡'],
  ['maxEnergy', '⚡макс'],
  ['defense', '🛡️'],
  ['integrity', '🫀'],
  ['xp', '🧬'],
]

export function formatIncome(income: IncomeLike): string[] {
  const out: string[] = []
  for (const [key, icon] of INCOME_ICONS) {
    const value = income[key]
    if (!value) continue
    out.push(`${icon}+${value}`)
  }
  if (income.suppression) out.push(`🌫️+${Math.round(income.suppression * 100)}%`)
  return out
}
