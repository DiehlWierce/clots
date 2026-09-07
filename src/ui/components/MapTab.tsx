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
import type { ContentTranslator } from '@/i18n/content/translate'
import type { Dictionary } from '@/i18n'

interface Props {
  state: GameState
  dispatch: (action: GameAction) => void
  tc: ContentTranslator
  t: Dictionary
}

function SectorCard({
  sector,
  state,
  tc,
  t,
  onSelect,
}: {
  sector: SectorDef
  state: GameState
  tc: ContentTranslator
  t: Dictionary
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
          {SECTOR_TYPE_ICON[sector.type]} {tc.sector(sector.id, 'name', sector.name)}
        </span>
        <span className="sector__type">
          {tc.sectorType(sector.type, SECTOR_TYPE_LABEL[sector.type])}
        </span>
      </span>
      <span className="sector__row">
        {owned ? (
          <span className="tag tag--good">{t.map.owned}</span>
        ) : reachable ? (
          <span className="tag tag--info">{t.map.available}</span>
        ) : (
          <span className="tag">{t.map.needNeighbour}</span>
        )}
        {sector.garrison && !owned ? <span className="tag tag--bad">{t.map.garrison}</span> : null}
        <span className="tag">
          {t.map.difficulty} {sector.difficulty}
        </span>
        {sector.heat > 0 ? (
          <span className="tag tag--warn">
            {t.map.noise} +{sector.heat}
          </span>
        ) : null}
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
              {t.map.delivered} {Math.round(delivery.factor * 100)}% · {delivery.hops}{' '}
              {t.map.hopsToHub}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  )
}

export function MapTab({ state, dispatch, tc, t }: Props) {
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
          <h2>{t.map.title}</h2>
          <p>
            {t.map.captured} {state.controlled.length} {t.map.of} {SECTORS.length}.{' '}
            {t.map.reachRule}
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
            {t.map.schema}
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
            {t.map.list}
          </button>
        </div>

        {view === 'graph' ? (
          <>
            <SectorGraph
              state={state}
              tc={tc}
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
                  <h3>{tc.region(region.id, 'name', region.name)}</h3>
                  <span className="region__meta">
                    {tc.region(region.id, 'subtitle', region.subtitle)} · {owned} / {total}
                  </span>
                </div>
                <p className="region__desc">
                  {tc.region(region.id, 'description', region.description)}
                </p>
                <div className="grid">
                  {visible.map(sector => (
                    <SectorCard
                      key={sector.id}
                      sector={sector}
                      state={state}
                      tc={tc}
                      t={t}
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
              {SECTOR_TYPE_ICON[selected.type]} {tc.sector(selected.id, 'name', selected.name)}
            </h2>
            <p>{tc.sectorType(selected.type, SECTOR_TYPE_LABEL[selected.type])}</p>
          </div>
          <p className="muted" style={{ marginBottom: 'var(--sp-3)' }}>
            {tc.sector(selected.id, 'description', selected.description)}
          </p>

          {garrison && !selectedOwned ? (
            <div className="enemy">
              <div className="node__head">
                <div>
                  <div className="node__name">
                    Гарнизон: {tc.enemy(garrison.id, 'name', garrison.name)}
                  </div>
                  <div className="node__desc">
                    {tc.enemy(garrison.id, 'description', garrison.description)}
                  </div>
                </div>
                <span className="node__level">
                  {tc.enemy(garrison.id, 'title', garrison.title)}
                </span>
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
            {t.map.neighbours}:{' '}
            {neighborsOf(selected.id)
              .map(id => {
                const neighbor = getSector(id)
                return neighbor ? tc.sector(neighbor.id, 'name', neighbor.name) : id
              })
              .join(', ') || '—'}
          </p>

          {selectedOwned ? (
            <span className="tag tag--good">{t.map.alreadyOwned}</span>
          ) : selectedReachable ? (
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={state.energy < captureEnergy}
              onClick={() => dispatch({ type: 'map/capture', sectorId: selected.id })}
            >
              {selected.garrison
                ? `${t.map.assault} (⚡${captureEnergy})`
                : `${t.map.occupy} (⚡${captureEnergy})`}
            </button>
          ) : (
            <span className="tag">{t.map.unreachable}</span>
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
