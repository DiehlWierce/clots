import { useMemo, useState } from 'react'
import { DOCTRINES, DOCTRINE_PATHS, MODULES, TECHS } from '@/engine/content'
import { canAfford, doctrineForkBlocked, nextCost, requirementsMet } from '@/engine/selectors'
import { usePersistentState } from '../hooks/usePersistentState'
import { haptics } from '@/telegram'
import { formatCost, formatEffects } from '../format'
import type { GameAction } from '@/engine/actions'
import type { CitadelEffects, DoctrinePath, GameState, ResourceBag } from '@/engine/types'
import type { ContentTranslator } from '@/i18n/content/translate'
import type { Dictionary } from '@/i18n'

interface Props {
  state: GameState
  dispatch: (action: GameAction) => void
  tc: ContentTranslator
  t: Dictionary
}

type Section = 'modules' | 'doctrines' | 'techs'

/**
 * Порядок вывода дерева.
 *
 * «По веткам» — исходная структура. «Доступные» поднимает наверх то, что уже
 * по карману, чтобы не мотать список в поисках доступной покупки.
 * «Дешевле» упорядочивает по стоимости следующего уровня.
 */
type SortMode = 'branch' | 'available' | 'cheapest'

const SORT_MODES: SortMode[] = ['branch', 'available', 'cheapest']

/** Условная цена набора ресурсов — для сравнения покупок между собой. */
function costWeight(cost: ResourceBag | undefined): number {
  if (!cost) return Number.MAX_SAFE_INTEGER
  return (cost.plasma ?? 0) + (cost.clots ?? 0) * 3 + (cost.essence ?? 0) * 30
}

interface Sortable {
  id: string
  tier: number
  maxLevel: number
  costs: ResourceBag[]
  requires?: string[]
  requiresAny?: boolean
}

/** Упорядочивает элементы ветки по выбранному режиму. */
function sortItems<T extends Sortable>(
  items: T[],
  mode: SortMode,
  levels: Record<string, number>,
  state: GameState,
): T[] {
  if (mode === 'branch') return [...items].sort((a, b) => a.tier - b.tier)

  const buyable = (item: T): boolean => {
    const level = levels[item.id] ?? 0
    if (level >= item.maxLevel) return false
    if (!requirementsMet(levels, item.requires, item.requiresAny)) return false
    const cost = nextCost(item.costs, level)
    return cost !== undefined && canAfford(state, cost)
  }

  return [...items].sort((a, b) => {
    if (mode === 'available') {
      const diff = Number(buyable(b)) - Number(buyable(a))
      if (diff !== 0) return diff
    }
    const weight =
      costWeight(nextCost(a.costs, levels[a.id] ?? 0)) -
      costWeight(nextCost(b.costs, levels[b.id] ?? 0))
    if (weight !== 0) return weight
    return a.tier - b.tier
  })
}

interface UpgradeLike {
  id: string
  name: string
  description: string
  maxLevel: number
  costs: ResourceBag[]
  effects: CitadelEffects
  requires?: string[]
  requiresAny?: boolean
}

function Pips({ level, max }: { level: number; max: number }) {
  return (
    <span className="pips" aria-label={`Уровень ${level} из ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pip${i < level ? ' pip--on' : ''}`} />
      ))}
    </span>
  )
}

function UpgradeCard({
  item,
  level,
  levels,
  state,
  onBuy,
  lockedReason,
  confirmNote,
  name,
  description,
  labels,
}: {
  item: UpgradeLike
  level: number
  levels: Record<string, number>
  state: GameState
  onBuy: () => void
  lockedReason?: string | undefined
  /** Предупреждение перед необратимой покупкой. */
  confirmNote?: string | undefined
  name: string
  description: string
  labels: Record<string, string>
}) {
  const maxed = level >= item.maxLevel
  const cost = nextCost(item.costs, level)
  const requirementsOk = requirementsMet(levels, item.requires, item.requiresAny)
  const affordable = cost ? canAfford(state, cost) : false
  const locked = lockedReason !== undefined || !requirementsOk

  return (
    <div className={`node${level > 0 ? ' node--owned' : ''}${locked ? ' node--locked' : ''}`}>
      <div className="node__head">
        <div>
          <div className="node__name">{name}</div>
          <div className="node__desc">{description}</div>
        </div>
        <span className="node__level">
          <Pips level={level} max={item.maxLevel} />
        </span>
      </div>

      <div className="effects">
        {formatEffects(item.effects, labels, Math.max(1, level)).map(text => (
          <span key={text} className="tag tag--good">
            {text}
          </span>
        ))}
      </div>

      {maxed ? (
        <span className="tag tag--good">Максимальный уровень</span>
      ) : lockedReason !== undefined ? (
        <span className="tag tag--bad">{lockedReason}</span>
      ) : !requirementsOk ? (
        <span className="tag">Требуется предыдущий уровень ветки</span>
      ) : (
        <>
          {confirmNote !== undefined ? <span className="tag tag--warn">{confirmNote}</span> : null}
          <button
            type="button"
            className={`btn${affordable ? ' btn--primary' : ''} btn--block`}
            disabled={!affordable}
            onClick={onBuy}
          >
            {confirmNote !== undefined
              ? 'Подтвердить выбор'
              : `${level === 0 ? 'Открыть' : `Улучшить до ${level + 1}`} · ${cost ? formatCost(cost) : '—'}`}
          </button>
        </>
      )}
    </div>
  )
}

function groupByBranch<T extends { branch: string; tier: number }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const list = map.get(item.branch) ?? []
    list.push(item)
    map.set(item.branch, list)
  }
  return [...map.entries()].map(([branch, list]) => [
    branch,
    [...list].sort((a, b) => a.tier - b.tier),
  ])
}

export function DevelopmentTab({ state, dispatch, tc, t }: Props) {
  const [section, setSection] = useState<Section>('modules')
  // Выбор пути и развилки необратим до конца партии, поэтому такие покупки
  // проходят через подтверждение, а не совершаются одним нажатием.
  const [confirm, setConfirm] = useState<string | null>(null)
  // Выбор сортировки — предпочтение игрока, а не часть партии: живёт отдельно.
  const [sort, setSort] = usePersistentState<SortMode>('clots:dev-sort', 'branch', SORT_MODES)

  const moduleBranches = useMemo(() => groupByBranch(MODULES), [])
  const techBranches = useMemo(() => groupByBranch(TECHS), [])

  const sections: { id: Section; label: string; count: number }[] = [
    { id: 'modules', label: 'Модули', count: Object.keys(state.modules).length },
    { id: 'doctrines', label: 'Доктрины', count: Object.keys(state.doctrines).length },
    { id: 'techs', label: 'Технологии', count: Object.keys(state.techs).length },
  ]

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Развитие империи</h2>
        <p>Модули строят цитадель, технологии — экономику, доктрины задают путь.</p>
      </div>

      <div className="segmented" style={{ marginBottom: 'var(--sp-4)' }} role="tablist">
        {sections.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="segmented__item"
            aria-selected={section === item.id}
            onClick={() => {
              setSection(item.id)
              haptics.select()
            }}
          >
            {item.label} {item.count}
          </button>
        ))}
      </div>

      <div
        className="segmented"
        role="radiogroup"
        aria-label={t.development.sort}
        style={{ marginBottom: 'var(--sp-3)' }}
      >
        {SORT_MODES.map(mode => (
          <button
            key={mode}
            type="button"
            role="radio"
            className="segmented__item"
            aria-checked={sort === mode}
            onClick={() => {
              setSort(mode)
              haptics.select()
            }}
          >
            {mode === 'branch'
              ? t.development.sortDefault
              : mode === 'available'
                ? t.development.sortAvailable
                : t.development.sortCheapest}
          </button>
        ))}
      </div>

      {section === 'modules' &&
        moduleBranches.map(([branch, items]) => (
          <div key={branch} className="branch">
            <div className="branch__name">{branch}</div>
            <div className="grid">
              {sortItems(items, sort, state.modules, state).map(item => (
                <UpgradeCard
                  key={item.id}
                  item={item}
                  level={state.modules[item.id] ?? 0}
                  levels={state.modules}
                  state={state}
                  labels={t.effects}
                  name={tc.module(item.id, 'name', item.name)}
                  description={tc.module(item.id, 'description', item.description)}
                  onBuy={() => dispatch({ type: 'module/buy', id: item.id })}
                />
              ))}
            </div>
          </div>
        ))}

      {section === 'techs' &&
        techBranches.map(([branch, items]) => (
          <div key={branch} className="branch">
            <div className="branch__name">{branch}</div>
            <div className="grid">
              {sortItems(items, sort, state.techs, state).map(item => (
                <UpgradeCard
                  key={item.id}
                  item={item}
                  level={state.techs[item.id] ?? 0}
                  levels={state.techs}
                  state={state}
                  labels={t.effects}
                  name={tc.tech(item.id, 'name', item.name)}
                  description={tc.tech(item.id, 'description', item.description)}
                  onBuy={() => dispatch({ type: 'tech/buy', id: item.id })}
                />
              ))}
            </div>
          </div>
        ))}

      {section === 'doctrines' && (
        <>
          <p className="muted" style={{ marginBottom: 'var(--sp-4)' }}>
            {state.doctrinePath === null
              ? 'Путь ещё не выбран. Первая принятая доктрина закроет два других пути навсегда — это главное решение партии.'
              : t.development.pathChosen}
          </p>
          {(Object.keys(DOCTRINE_PATHS) as DoctrinePath[])
            // Закрытые пути не показываем вовсе: смотреть на то, что уже
            // недоступно до конца партии, незачем.
            .filter(pathId => state.doctrinePath === null || state.doctrinePath === pathId)
            .map(pathId => {
              const path = DOCTRINE_PATHS[pathId]
              const blocked = false
              const items = DOCTRINES.filter(d => d.path === pathId).sort((a, b) => a.tier - b.tier)
              return (
                <div key={pathId} className="branch">
                  <div className="branch__name">
                    {tc.doctrinePath(pathId, 'name', path.name)} — «
                    {tc.doctrinePath(pathId, 'motto', path.motto)}»
                  </div>
                  <p className="muted" style={{ marginBottom: 'var(--sp-2)' }}>
                    {tc.doctrinePath(pathId, 'description', path.description)} На третьей ступени
                    путь расходится: взяв одну доктрину, соседнюю уже не получить.
                  </p>
                  <div className="grid">
                    {sortItems(items, sort, state.doctrines, state).map(item => {
                      const forkBlocked = doctrineForkBlocked(state, item)
                      const reason = blocked
                        ? 'Путь закрыт: выбран другой'
                        : forkBlocked
                          ? 'Развилка пройдена: выбрана соседняя доктрина'
                          : undefined
                      return (
                        <UpgradeCard
                          key={item.id}
                          item={item}
                          level={state.doctrines[item.id] ?? 0}
                          levels={state.doctrines}
                          state={state}
                          labels={t.effects}
                          name={tc.doctrine(item.id, 'name', item.name)}
                          description={tc.doctrine(item.id, 'description', item.description)}
                          onBuy={() => {
                            const irreversible =
                              (state.doctrinePath === null || item.fork !== undefined) &&
                              (state.doctrines[item.id] ?? 0) === 0
                            if (irreversible && confirm !== item.id) {
                              setConfirm(item.id)
                              haptics.warning()
                              return
                            }
                            setConfirm(null)
                            dispatch({ type: 'doctrine/buy', id: item.id })
                          }}
                          {...(reason !== undefined ? { lockedReason: reason } : {})}
                          {...(confirm === item.id
                            ? {
                                confirmNote:
                                  state.doctrinePath === null
                                    ? 'Выбор пути закроет два других навсегда. Нажмите ещё раз.'
                                    : 'Соседняя доктрина развилки закроется навсегда. Нажмите ещё раз.',
                              }
                            : {})}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </>
      )}
    </section>
  )
}
