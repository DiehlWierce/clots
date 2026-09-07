import { useState } from 'react'
import { BALANCE } from '@/engine/balance'
import { REGIONS, SECTORS, getEnemy, getSector, neighborsOf } from '@/engine/content'
import { isSectorReachable, sectorDelivery } from '@/engine/selectors'
import { SECTOR_TYPE_ICON, SECTOR_TYPE_LABEL, formatIncome } from '../format'
import { SectorGraph } from './SectorGraph'
import { Empty } from './Empty'
import { haptics } from '@/telegram'
import type { GameAction } from '@/engine/actions'
import type { GameState, SectorDef } from '@/engine/types'

interface Props {
  state: GameState
  dispatch: (action: GameAction) => void
}

function SectorCard({
  sector,
  state,
  onSelect,
}: {
  sector: SectorDef
  state: GameState
  onSelect: () => void
}) {
  const owned = state.controlled.includes(sector.id)
  const reachable = isSectorReachable(state, sector.id)
  const income = sector.income ? formatIncome(sector.income) : []
  // Доход физически идёт по сети: показываем, сколько реально доходит,
  // иначе потери на доставке выглядели бы как «числа какие-то не те».
  const delivery = owned && sector.income ? sectorDelivery(state, sector.id) : null

  return (
    <button
      type="button"
      className={`sector${owned ? ' sector--owned' : ''}${!owned && !reachable ? ' sector--locked' : ''}`}
      aria-pressed={state.selectedSector === sector.id}
      onClick={onSelect}
    >
      <span className="sector__top">
        <span className="sector__name">
          {SECTOR_TYPE_ICON[sector.type]} {sector.name}
        </span>
        <span className="sector__type">{SECTOR_TYPE_LABEL[sector.type]}</span>
      </span>
      <span className="sector__row">
        {owned ? (
          <span className="tag tag--good">под контролем</span>
        ) : reachable ? (
          <span className="tag tag--info">доступен</span>
        ) : (
          <span className="tag">нужен сосед</span>
        )}
        {sector.garrison && !owned ? <span className="tag tag--bad">гарнизон</span> : null}
        <span className="tag">сложность {sector.difficulty}</span>
        {sector.heat > 0 ? <span className="tag tag--warn">шум +{sector.heat}</span> : null}
      </span>
      {income.length > 0 ? (
        <span className="sector__row">
          {income.map(item => (
            <span key={item} className="tag tag--good">
              {item}
            </span>
          ))}
          {delivery && delivery.factor < 1 ? (
            <span className="tag tag--warn">
              доходит {Math.round(delivery.factor * 100)}% · {delivery.hops} шагов до узла
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  )
}

export function MapTab({ state, dispatch }: Props) {
  const [view, setView] = useState<'graph' | 'list'>('graph')
  const selected = state.selectedSector ? getSector(state.selectedSector) : null
  const selectedOwned = selected ? state.controlled.includes(selected.id) : false
  const selectedReachable = selected ? isSectorReachable(state, selected.id) : false
  const garrison = selected?.garrison ? getEnemy(selected.garrison) : null
  const captureEnergy = selected?.garrison
    ? BALANCE.actions.assault.energy
    : BALANCE.actions.occupy.energy

  return (
    <>
      <section className="panel">
        <div className="panel__head">
          <h2>Сосудистая сеть</h2>
          <p>
            Захвачено {state.controlled.length} из {SECTORS.length}. Сектор доступен, только если
            граничит с уже вашим.
          </p>
        </div>

        <div className="segmented" role="tablist" style={{ marginBottom: 'var(--sp-3)' }}>
          <button
            type="button"
            role="tab"
            className="segmented__item"
            aria-selected={view === 'graph'}
            onClick={() => {
              setView('graph')
              haptics.select()
            }}
          >
            Схема
          </button>
          <button
            type="button"
            role="tab"
            className="segmented__item"
            aria-selected={view === 'list'}
            onClick={() => {
              setView('list')
              haptics.select()
            }}
          >
            Список
          </button>
        </div>

        {view === 'graph' ? (
          <>
            <SectorGraph
              state={state}
              onSelect={id => {
                haptics.select()
                dispatch({ type: 'map/select', sectorId: id })
              }}
            />
            <div className="graph-legend">
              <span className="graph-legend__item">
                <span
                  className="graph-legend__dot"
                  style={{ borderColor: 'var(--c-good)', background: 'transparent' }}
                />
                под контролем
              </span>
              <span className="graph-legend__item">
                <span
                  className="graph-legend__dot"
                  style={{ borderColor: 'var(--c-accent)', background: 'transparent' }}
                />
                доступен
              </span>
              <span className="graph-legend__item">
                <span className="graph-legend__dot" />
                разведан
              </span>
              <span className="graph-legend__item">
                <span
                  className="graph-legend__dot"
                  style={{ background: 'var(--c-bad)', borderColor: 'var(--c-bad)' }}
                />
                гарнизон
              </span>
            </div>
          </>
        ) : null}

        {view === 'list' &&
          REGIONS.filter(region => state.regions.includes(region.id)).map(region => {
            const visible = SECTORS.filter(
              s =>
                s.region === region.id &&
                (state.controlled.includes(s.id) || state.revealed.includes(s.id)),
            )
            const owned = SECTORS.filter(
              s => s.region === region.id && state.controlled.includes(s.id),
            ).length
            const total = SECTORS.filter(s => s.region === region.id).length

            return (
              <div key={region.id} className="region">
                <div className="region__title">
                  <h3>{region.name}</h3>
                  <span className="region__meta">
                    {region.subtitle} · {owned} / {total}
                  </span>
                </div>
                <p className="region__desc">{region.description}</p>
                <div className="grid">
                  {visible.map(sector => (
                    <SectorCard
                      key={sector.id}
                      sector={sector}
                      state={state}
                      onSelect={() => dispatch({ type: 'map/select', sectorId: sector.id })}
                    />
                  ))}
                </div>
              </div>
            )
          })}
      </section>

      {!selected ? (
        <section className="panel">
          <Empty
            icon="🗺️"
            title="Сектор не выбран"
            text="Выберите узел на схеме, чтобы увидеть его доход, гарнизон и соседей."
          />
        </section>
      ) : null}

      {selected ? (
        <section className="panel">
          <div className="panel__head">
            <h2>
              {SECTOR_TYPE_ICON[selected.type]} {selected.name}
            </h2>
            <p>{SECTOR_TYPE_LABEL[selected.type]}</p>
          </div>
          <p className="muted" style={{ marginBottom: 'var(--sp-3)' }}>
            {selected.description}
          </p>

          {garrison && !selectedOwned ? (
            <div className="enemy">
              <div className="node__head">
                <div>
                  <div className="node__name">Гарнизон: {garrison.name}</div>
                  <div className="node__desc">{garrison.description}</div>
                </div>
                <span className="node__level">{garrison.title}</span>
              </div>
              <div className="effects" style={{ marginTop: 'var(--sp-2)' }}>
                <span className="tag tag--bad">броня {garrison.armor}</span>
                {garrison.regen ? (
                  <span className="tag tag--warn">регенерация {garrison.regen}</span>
                ) : null}
                {garrison.weakness ? (
                  <span className="tag tag--good">
                    уязвим к: {weaknessLabel(garrison.weakness)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="muted" style={{ marginBottom: 'var(--sp-3)' }}>
            Соседние секторы:{' '}
            {neighborsOf(selected.id)
              .map(id => getSector(id)?.name ?? id)
              .join(', ') || '—'}
          </p>

          {selectedOwned ? (
            <span className="tag tag--good">Сектор уже под контролем империи</span>
          ) : selectedReachable ? (
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={state.energy < captureEnergy}
              onClick={() => dispatch({ type: 'map/capture', sectorId: selected.id })}
            >
              {selected.garrison
                ? `⚔️ Штурмовать (⚡${captureEnergy})`
                : `🚩 Занять сектор (⚡${captureEnergy})`}
            </button>
          ) : (
            <span className="tag">Недостижим: сначала возьмите соседний сектор</span>
          )}
        </section>
      ) : null}
    </>
  )
}

function weaknessLabel(action: string): string {
  switch (action) {
    case 'strike':
      return 'пульс-удар'
    case 'surge':
      return 'гемо-всплеск'
    case 'rupture':
      return 'вскрытие'
    case 'guard':
      return 'глухая оборона'
    default:
      return action
  }
}
