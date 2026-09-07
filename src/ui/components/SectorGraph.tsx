import { useMemo } from 'react'
import { MAP_LAYOUT } from '@/engine/systems/layout'
import { REGIONS, getSector } from '@/engine/content'
import { isSectorReachable } from '@/engine/selectors'
import { SECTOR_TYPE_ICON } from '../format'
import type { GameState } from '@/engine/types'
import type { ContentTranslator } from '@/i18n/content/translate'

interface Props {
  state: GameState
  tc: ContentTranslator
  onSelect: (sectorId: string) => void
}

/** Шаг сетки в пикселях: расстояние между соседними уровнями и колонками. */
const STEP_X = 92
const STEP_Y = 78
const RADIUS = 20
const PADDING = 34

type Status = 'owned' | 'reachable' | 'revealed' | 'hidden'

function statusOf(state: GameState, id: string): Status {
  if (state.controlled.includes(id)) return 'owned'
  if (isSectorReachable(state, id)) return 'reachable'
  if (state.revealed.includes(id)) return 'revealed'
  return 'hidden'
}

const FILL: Record<Status, string> = {
  owned: 'var(--c-good)',
  reachable: 'var(--c-accent)',
  revealed: 'var(--c-surface)',
  hidden: 'var(--c-bg-elevated)',
}

/**
 * Карта как граф.
 *
 * Граф из 38 секторов существовал в данных, но игрок видел плоский список
 * карточек: связи, ради которых он делался, были невидимы. Здесь видно, что
 * откуда достижимо и какие маршруты ведут вглубь системы.
 */
export function SectorGraph({ state, tc, onSelect }: Props) {
  const { nodes, edges, regionBounds } = MAP_LAYOUT

  const visibleRegions = useMemo(() => new Set(state.regions), [state.regions])

  // Полотно строится по видимым узлам, а не по всей карте: иначе на первом
  // регионе игрок смотрел бы на один сектор посреди пустого поля.
  const geometry = useMemo(() => {
    const visible = [...nodes.values()].filter(node => {
      const sector = getSector(node.id)
      return sector ? visibleRegions.has(sector.region) : false
    })
    const source = visible.length > 0 ? visible : [...nodes.values()]
    const xs = source.map(n => n.x)
    const ys = source.map(n => n.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const toX = (x: number) => (x - minX) * STEP_X + PADDING
    const toY = (y: number) => (y - minY) * STEP_Y + PADDING
    const width = (Math.max(...xs) - minX) * STEP_X + PADDING * 2
    const height = (Math.max(...ys) - minY) * STEP_Y + PADDING * 2
    return { toX, toY, width, height }
  }, [nodes, visibleRegions])

  return (
    <div className="graph">
      <svg
        className="graph__svg"
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        width={geometry.width}
        height={geometry.height}
        role="img"
        aria-label="Карта сосудистой сети"
      >
        {/* Полосы регионов — фон, помогающий понять, где заканчивается один
            и начинается следующий. */}
        {REGIONS.filter(r => visibleRegions.has(r.id)).map(region => {
          const bounds = regionBounds.get(region.id)
          if (!bounds) return null
          const top = geometry.toY(bounds.minY) - STEP_Y / 2
          const bottom = geometry.toY(bounds.maxY) + STEP_Y / 2
          return (
            <g key={region.id}>
              <rect
                x={0}
                y={top}
                width={geometry.width}
                height={bottom - top}
                fill="var(--c-bg-elevated)"
                opacity={0.5}
                rx={12}
              />
              <text x={10} y={top + 18} className="graph__region">
                {tc.region(region.id, 'name', region.name)}
              </text>
            </g>
          )
        })}

        {edges.map(edge => {
          const from = nodes.get(edge.from)
          const to = nodes.get(edge.to)
          if (!from || !to) return null
          const fromSector = getSector(edge.from)
          const toSector = getSector(edge.to)
          if (!fromSector || !toSector) return null
          if (!visibleRegions.has(fromSector.region) || !visibleRegions.has(toSector.region)) {
            return null
          }
          // Связь между двумя своими секторами — рабочая магистраль сети.
          const live = state.controlled.includes(edge.from) && state.controlled.includes(edge.to)
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={geometry.toX(from.x)}
              y1={geometry.toY(from.y)}
              x2={geometry.toX(to.x)}
              y2={geometry.toY(to.y)}
              stroke={live ? 'var(--c-good)' : 'var(--c-border)'}
              strokeWidth={live ? 3 : 1.5}
              opacity={live ? 0.8 : 0.5}
            />
          )
        })}

        {[...nodes.values()].map(node => {
          const sector = getSector(node.id)
          if (!sector || !visibleRegions.has(sector.region)) return null
          const status = statusOf(state, node.id)
          if (status === 'hidden') return null
          const cx = geometry.toX(node.x)
          const cy = geometry.toY(node.y)
          const selected = state.selectedSector === node.id

          return (
            <g
              key={node.id}
              className="graph__node"
              onClick={() => onSelect(node.id)}
              role="button"
              tabIndex={0}
              aria-label={`${tc.sector(sector.id, 'name', sector.name)}, ${
                status === 'owned'
                  ? 'под контролем'
                  : status === 'reachable'
                    ? 'доступен'
                    : 'разведан'
              }`}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(node.id)
                }
              }}
            >
              {selected ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={RADIUS + 6}
                  fill="none"
                  stroke="var(--c-accent)"
                  strokeWidth={2}
                />
              ) : null}
              <circle
                cx={cx}
                cy={cy}
                r={RADIUS}
                fill={FILL[status]}
                fillOpacity={status === 'owned' ? 0.25 : status === 'reachable' ? 0.22 : 1}
                stroke={
                  status === 'owned'
                    ? 'var(--c-good)'
                    : status === 'reachable'
                      ? 'var(--c-accent)'
                      : 'var(--c-border)'
                }
                strokeWidth={2}
              />
              <text x={cx} y={cy + 5} className="graph__icon">
                {SECTOR_TYPE_ICON[sector.type]}
              </text>
              {sector.garrison && status !== 'owned' ? (
                <circle cx={cx + RADIUS - 4} cy={cy - RADIUS + 4} r={5} fill="var(--c-bad)" />
              ) : null}
              <text x={cx} y={cy + RADIUS + 14} className="graph__label">
                {(() => {
                  const label = tc.sector(sector.id, 'name', sector.name)
                  return label.length > 14 ? `${label.slice(0, 13)}…` : label
                })()}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
