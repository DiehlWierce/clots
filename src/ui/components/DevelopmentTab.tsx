import { useMemo, useState } from 'react'
import { DOCTRINES, DOCTRINE_PATHS, MODULES, TECHS } from '@/engine/content'
import { canAfford, doctrineForkBlocked, nextCost, requirementsMet } from '@/engine/selectors'
import { haptics } from '@/telegram'
import { formatCost, formatEffects } from '../format'
import type { GameAction } from '@/engine/actions'
import type { CitadelEffects, DoctrinePath, GameState, ResourceBag } from '@/engine/types'

interface Props {
  state: GameState
  dispatch: (action: GameAction) => void
}

type Section = 'modules' | 'doctrines' | 'techs'

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
}: {
  item: UpgradeLike
  level: number
  levels: Record<string, number>
  state: GameState
  onBuy: () => void
  lockedReason?: string | undefined
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
          <div className="node__name">{item.name}</div>
          <div className="node__desc">{item.description}</div>
        </div>
        <span className="node__level">
          <Pips level={level} max={item.maxLevel} />
        </span>
      </div>

      <div className="effects">
        {formatEffects(item.effects, Math.max(1, level)).map(text => (
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
        <button
          type="button"
          className={`btn${affordable ? ' btn--primary' : ''} btn--block`}
          disabled={!affordable}
          onClick={onBuy}
        >
          {level === 0 ? 'Открыть' : `Улучшить до ${level + 1}`} · {cost ? formatCost(cost) : '—'}
        </button>
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

export function DevelopmentTab({ state, dispatch }: Props) {
  const [section, setSection] = useState<Section>('modules')

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

      {section === 'modules' &&
        moduleBranches.map(([branch, items]) => (
          <div key={branch} className="branch">
            <div className="branch__name">{branch}</div>
            <div className="grid">
              {items.map(item => (
                <UpgradeCard
                  key={item.id}
                  item={item}
                  level={state.modules[item.id] ?? 0}
                  levels={state.modules}
                  state={state}
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
              {items.map(item => (
                <UpgradeCard
                  key={item.id}
                  item={item}
                  level={state.techs[item.id] ?? 0}
                  levels={state.techs}
                  state={state}
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
              : `Путь империи: ${DOCTRINE_PATHS[state.doctrinePath].name}. Остальные пути закрыты.`}
          </p>
          {(Object.keys(DOCTRINE_PATHS) as DoctrinePath[]).map(pathId => {
            const path = DOCTRINE_PATHS[pathId]
            const blocked = state.doctrinePath !== null && state.doctrinePath !== pathId
            const items = DOCTRINES.filter(d => d.path === pathId).sort((a, b) => a.tier - b.tier)
            return (
              <div key={pathId} className="branch">
                <div className="branch__name">
                  {path.name} — «{path.motto}»
                </div>
                <p className="muted" style={{ marginBottom: 'var(--sp-2)' }}>
                  {path.description} На третьей ступени путь расходится: взяв одну доктрину,
                  соседнюю уже не получить.
                </p>
                <div className="grid">
                  {items.map(item => {
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
                        onBuy={() => dispatch({ type: 'doctrine/buy', id: item.id })}
                        {...(reason !== undefined ? { lockedReason: reason } : {})}
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
