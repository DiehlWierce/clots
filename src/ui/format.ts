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

const EFFECT_LABELS: Record<keyof CitadelEffects, { label: string; percent?: boolean }> = {
  attack: { label: 'Атака' },
  defense: { label: 'Защита' },
  maxIntegrity: { label: 'Целостность' },
  maxEnergy: { label: 'Энергия' },
  masking: { label: 'Маскировка/цикл' },
  plasmaYield: { label: 'Плазма', percent: true },
  clotYield: { label: 'Сгустки', percent: true },
  essenceYield: { label: 'Эссенция', percent: true },
  suppression: { label: 'Подавление угрозы', percent: true },
  xpYield: { label: 'Опыт', percent: true },
  pierce: { label: 'Пробитие' },
  regen: { label: 'Регенерация/цикл' },
}

export function formatEffects(effects: CitadelEffects, multiplier = 1): string[] {
  const out: string[] = []
  for (const [key, config] of Object.entries(EFFECT_LABELS) as [
    keyof CitadelEffects,
    { label: string; percent?: boolean },
  ][]) {
    const value = effects[key]
    if (value === undefined || value === 0) continue
    const scaled = value * multiplier
    out.push(
      config.percent
        ? `${config.label} +${Math.round(scaled * 100)}%`
        : `${config.label} +${Math.round(scaled * 10) / 10}`,
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
