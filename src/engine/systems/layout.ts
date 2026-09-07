import { REGIONS, SECTORS, SECTOR_EDGES, START_SECTOR, neighborsOf } from '../content'
import type { RegionId } from '../types'

/**
 * Раскладка карты для отрисовки графом.
 *
 * Координаты считаются один раз из самой структуры графа, а не задаются
 * руками в контенте: добавление сектора не требует подбора координат, и
 * рассинхронизации между данными и картинкой быть не может.
 *
 * Схема простая и предсказуемая: Y — глубина от стартового сектора (кратчайший
 * путь), X — разведение секторов одной глубины по горизонтали. Карта получается
 * вытянутой вниз (18 уровней против трёх колонок), что для телефона естественнее
 * широкой: сеть листается сверху вниз, от ядра к фронтиру.
 */

export interface LayoutNode {
  id: string
  region: RegionId
  x: number
  y: number
}

export interface LayoutEdge {
  from: string
  to: string
}

export interface MapLayout {
  nodes: Map<string, LayoutNode>
  edges: LayoutEdge[]
  width: number
  height: number
  /** Границы каждого региона — чтобы рисовать их отдельными полосами. */
  regionBounds: Map<RegionId, { minX: number; maxX: number; minY: number; maxY: number }>
}

/** Глубина каждого сектора: длина кратчайшего пути от стартового. */
function depths(): Map<string, number> {
  const depth = new Map<string, number>([[START_SECTOR, 0]])
  const queue = [START_SECTOR]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    const next = (depth.get(current) ?? 0) + 1
    for (const neighbor of neighborsOf(current)) {
      if (depth.has(neighbor)) continue
      depth.set(neighbor, next)
      queue.push(neighbor)
    }
  }
  return depth
}

export function buildLayout(): MapLayout {
  const depth = depths()

  // Группируем по глубине и раскладываем каждую колонку по вертикали.
  const columns = new Map<number, string[]>()
  for (const sector of SECTORS) {
    const d = depth.get(sector.id) ?? 0
    const list = columns.get(d) ?? []
    list.push(sector.id)
    columns.set(d, list)
  }

  const nodes = new Map<string, LayoutNode>()
  const maxColumn = Math.max(...columns.keys())

  for (const [column, ids] of columns) {
    // Сортировка внутри колонки по региону и id делает раскладку стабильной:
    // одна и та же карта всегда рисуется одинаково.
    const ordered = [...ids].sort((a, b) => {
      const ra = SECTORS.findIndex(s => s.id === a)
      const rb = SECTORS.findIndex(s => s.id === b)
      return ra - rb
    })
    ordered.forEach((id, index) => {
      const sector = SECTORS.find(s => s.id === id)
      if (!sector) return
      nodes.set(id, {
        id,
        region: sector.region,
        // Центрируем уровень относительно общей оси.
        x: index - (ordered.length - 1) / 2,
        y: column,
      })
    })
  }

  const regionBounds = new Map<
    RegionId,
    { minX: number; maxX: number; minY: number; maxY: number }
  >()
  for (const region of REGIONS) {
    const inRegion = [...nodes.values()].filter(n => n.region === region.id)
    if (inRegion.length === 0) continue
    regionBounds.set(region.id, {
      minX: Math.min(...inRegion.map(n => n.x)),
      maxX: Math.max(...inRegion.map(n => n.x)),
      minY: Math.min(...inRegion.map(n => n.y)),
      maxY: Math.max(...inRegion.map(n => n.y)),
    })
  }

  const xs = [...nodes.values()].map(n => n.x)

  return {
    nodes,
    edges: SECTOR_EDGES.map(([from, to]) => ({ from, to })),
    width: Math.max(...xs) - Math.min(...xs),
    height: maxColumn,
    regionBounds,
  }
}

/** Готовая раскладка: карта статична, поэтому считается один раз. */
export const MAP_LAYOUT: MapLayout = buildLayout()
