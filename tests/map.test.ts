import { describe, expect, it } from 'vitest'
import {
  REGIONS,
  SECTORS,
  SECTOR_EDGES,
  START_SECTOR,
  getSector,
  neighborsOf,
} from '@/engine/content'
import { ENEMIES, ENEMY_BY_ID } from '@/engine/content/enemies'
import { MODULES, DOCTRINES, TECHS } from '@/engine/content/upgrades'
import { MAP_LAYOUT, buildLayout } from '@/engine/systems/layout'

describe('целостность карты', () => {
  it('все рёбра ведут к существующим секторам', () => {
    for (const [a, b] of SECTOR_EDGES) {
      expect(getSector(a), `нет сектора ${a}`).toBeDefined()
      expect(getSector(b), `нет сектора ${b}`).toBeDefined()
    }
  })

  it('граф симметричен', () => {
    for (const sector of SECTORS) {
      for (const neighbor of neighborsOf(sector.id)) {
        expect(neighborsOf(neighbor)).toContain(sector.id)
      }
    }
  })

  it('идентификаторы секторов уникальны', () => {
    const ids = SECTORS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('каждый сектор достижим из стартового', () => {
    const seen = new Set([START_SECTOR])
    const queue = [START_SECTOR]
    while (queue.length > 0) {
      const current = queue.shift()
      if (current === undefined) break
      for (const next of neighborsOf(current)) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    const unreachable = SECTORS.filter(s => !seen.has(s.id)).map(s => s.id)
    expect(unreachable).toEqual([])
  })

  it('каждый регион, кроме первого, открывается существующим нексусом', () => {
    for (const region of REGIONS) {
      if (region.unlockedBy === null) continue
      const gate = getSector(region.unlockedBy)
      expect(gate, `нет нексуса ${region.unlockedBy}`).toBeDefined()
      expect(gate?.type).toBe('nexus')
    }
  })

  it('все гарнизоны ссылаются на существующих врагов', () => {
    for (const sector of SECTORS) {
      if (!sector.garrison) continue
      expect(ENEMY_BY_ID.has(sector.garrison), `нет врага ${sector.garrison}`).toBe(true)
    }
  })

  it('все кузницы выдают существующие модули', () => {
    const moduleIds = new Set(MODULES.map(m => m.id))
    for (const sector of SECTORS) {
      if (!sector.grantsModule) continue
      expect(moduleIds.has(sector.grantsModule), `нет модуля ${sector.grantsModule}`).toBe(true)
    }
  })
})

describe('целостность контента развития', () => {
  const cases = [
    { name: 'модули', items: MODULES },
    { name: 'доктрины', items: DOCTRINES },
    { name: 'технологии', items: TECHS },
  ]

  for (const { name, items } of cases) {
    it(`${name}: стоимость задана на каждый уровень`, () => {
      for (const item of items) {
        expect(item.costs.length, `${item.id}: costs != maxLevel`).toBe(item.maxLevel)
      }
    })

    it(`${name}: требования ссылаются на существующие элементы`, () => {
      const ids = new Set(items.map(i => i.id))
      for (const item of items) {
        for (const req of item.requires ?? []) {
          expect(ids.has(req), `${item.id} требует несуществующий ${req}`).toBe(true)
        }
      }
    })

    it(`${name}: стоимость растёт с уровнем`, () => {
      for (const item of items) {
        const totals = item.costs.map(
          c => (c.plasma ?? 0) + (c.clots ?? 0) * 3 + (c.essence ?? 0) * 30,
        )
        for (let i = 1; i < totals.length; i += 1) {
          expect(totals[i], `${item.id}: уровень ${i + 1} не дороже`).toBeGreaterThan(
            totals[i - 1] ?? 0,
          )
        }
      }
    })
  }

  it('у доктрин каждого пути ровно один корень', () => {
    for (const path of ['reaver', 'warden', 'weaver'] as const) {
      const roots = DOCTRINES.filter(d => d.path === path && !d.requires?.length)
      expect(roots.length, `путь ${path}`).toBe(1)
    }
  })

  it('паттерны врагов не пустые', () => {
    for (const enemy of ENEMIES) {
      expect(enemy.pattern.length, `${enemy.id}: пустой паттерн`).toBeGreaterThan(0)
    }
  })
})

/**
 * Раскладка графа считается из структуры карты, а не задаётся руками:
 * добавление сектора не требует подбора координат.
 */
describe('раскладка карты', () => {
  it('в раскладке есть каждый сектор', () => {
    expect(MAP_LAYOUT.nodes.size).toBe(SECTORS.length)
    for (const sector of SECTORS) {
      expect(MAP_LAYOUT.nodes.has(sector.id), `нет узла ${sector.id}`).toBe(true)
    }
  })

  it('рёбра раскладки совпадают с рёбрами карты', () => {
    expect(MAP_LAYOUT.edges.length).toBe(SECTOR_EDGES.length)
    for (const edge of MAP_LAYOUT.edges) {
      expect(MAP_LAYOUT.nodes.has(edge.from)).toBe(true)
      expect(MAP_LAYOUT.nodes.has(edge.to)).toBe(true)
    }
  })

  it('стартовый сектор на нулевой глубине, остальные глубже', () => {
    expect(MAP_LAYOUT.nodes.get(START_SECTOR)?.y).toBe(0)
    const throne = MAP_LAYOUT.nodes.get('ctx-throne')
    expect(throne?.y).toBeGreaterThan(10)
  })

  it('карта вытянута вниз, а не вбок: так она читается на телефоне', () => {
    expect(MAP_LAYOUT.height).toBeGreaterThan(MAP_LAYOUT.width)
  })

  it('регионы не перемешаны: каждый занимает свою полосу глубины', () => {
    const capillary = MAP_LAYOUT.regionBounds.get('capillary')
    const cortex = MAP_LAYOUT.regionBounds.get('cortex')
    expect(capillary).toBeDefined()
    expect(cortex).toBeDefined()
    if (!capillary || !cortex) return
    expect(cortex.minY).toBeGreaterThan(capillary.maxY)
  })

  it('раскладка стабильна: повторный расчёт даёт те же координаты', () => {
    const again = buildLayout()
    for (const [id, node] of MAP_LAYOUT.nodes) {
      expect(again.nodes.get(id)).toEqual(node)
    }
  })
})
