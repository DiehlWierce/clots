import { BALANCE } from '@/engine/balance'
import { EPOCH_MODIFIER_BY_ID, epochName } from '@/engine/content'
import { canAfford, ngPlusPressure } from '@/engine/selectors'
import { raidChance, reclaimChance } from '@/engine/systems/threat'
import { formatCost } from '../format'
import type { GameAction } from '@/engine/actions'
import type { DerivedStats, GameState } from '@/engine/types'
import type { ContentTranslator } from '@/i18n/content/translate'

interface Props {
  state: GameState
  stats: DerivedStats
  dispatch: (action: GameAction) => void
  tc: ContentTranslator
}

interface ActionSpec {
  action: GameAction
  title: string
  desc: string
  energy: number
  cost?: { plasma?: number; clots?: number; essence?: number }
  disabled?: boolean
}

export function CommandTab({ state, stats, dispatch, tc }: Props) {
  const a = BALANCE.actions

  const specs: ActionSpec[] = [
    {
      action: { type: 'action/harvest' },
      title: '💧 Сбор плазмы',
      desc: 'Выжимает плазму из русел вручную. Базовое действие на голодный старт.',
      energy: a.harvest.energy,
    },
    {
      action: { type: 'action/refine' },
      title: '🩸 Синтез сгустков',
      desc: 'Превращает плазму в сгустки — материал модулей и топливо всплеска.',
      energy: a.refine.energy,
      cost: a.refine.cost,
    },
    {
      action: { type: 'action/transmute' },
      title: '✨ Возгонка эссенции',
      desc: 'Сгущает сгустки в эссенцию для доктрин и технологий.',
      energy: a.transmute.energy,
      cost: a.transmute.cost,
    },
    {
      action: { type: 'action/mask' },
      title: '🌫️ Усилить маскировку',
      desc: `Поднимает маскировку на ${BALANCE.masking.actionGain}. Маскировка режет прирост угрозы.`,
      energy: BALANCE.masking.actionEnergy,
      cost: BALANCE.masking.actionCost,
      disabled: state.masking >= BALANCE.masking.max,
    },
    {
      action: { type: 'action/scan' },
      title: '👁️ Разведка потока',
      desc: `Снимает ${a.scan.threatRelief}% угрозы и раскрывает соседние секторы.`,
      energy: a.scan.energy,
    },
    {
      action: { type: 'action/mend' },
      title: '🫀 Восстановить ядро',
      desc: `Возвращает ${Math.max(a.mend.heal, Math.round(stats.maxIntegrity * a.mend.healShare))} целостности.`,
      energy: a.mend.energy,
      cost: a.mend.cost,
      disabled: state.integrity >= stats.maxIntegrity,
    },
  ]

  const chance = raidChance(state.threat)
  const lossChance = reclaimChance(state.threat)

  // Давление NG+ растёт молча, а игрок обязан понимать, почему стало тяжелее.
  const pressure = ngPlusPressure(state)

  return (
    <>
      {state.ngPlus > 0 ? (
        <div className="hint" style={{ borderColor: 'var(--c-warn)' }}>
          <span aria-hidden="true">♾️</span>
          <div className="hint__body">
            <div className="hint__title">
              Цикл {state.ngPlus + 1}-го порядка · давление ×{pressure.toFixed(2)}
            </div>
            <div className="hint__text">
              Система помнит прошлую империю: гарнизоны тяжелее, а угроза растёт тем быстрее, чем
              дольше идёт партия. Медлить здесь дороже, чем в первом прохождении.
            </div>
          </div>
        </div>
      ) : null}

      {state.siegeCyclesLeft > 0 ? (
        <div className="hint" style={{ borderColor: 'var(--c-bad)' }}>
          <span aria-hidden="true">🛡️</span>
          <div className="hint__body">
            <div className="hint__title">Осада: продержаться {state.siegeCyclesLeft} циклов</div>
            <div className="hint__text">
              Суверен низложен, но система перешла в контрнаступление: угроза растёт вдвое быстрее,
              рейды сильнее, окраины отбивают чаще. Выстоите — победа ваша.
            </div>
          </div>
        </div>
      ) : null}

      {chance > 0 ? (
        <div className="hint" style={{ borderColor: 'var(--c-warn)' }}>
          <span aria-hidden="true">🚨</span>
          <div className="hint__body">
            <div className="hint__title">
              Угроза {state.threat}% — риск рейда {Math.round(chance * 100)}% за цикл
            </div>
            <div className="hint__text">
              {/* Маскировка угрозу не снижает — она замедляет её прирост.
                  Совет «сбейте угрозу маскировкой» отправлял игрока делать
                  то, что не работает. Снижает угрозу только разведка. */}
              Сбить угрозу можно разведкой — не больше {BALANCE.threat.reliefCapPerCycle}% за цикл.
              Маскировка угрозу не снижает, она замедляет её прирост.
              {lossChance > 0
                ? ` Кроме того, иммунитет может отбить окраинный сектор: ${Math.round(lossChance * 100)}% за цикл.`
                : ''}
            </div>
          </div>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Действия цикла</h2>
          <p>
            Энергия {state.energy} / {stats.maxEnergy}. Завершите цикл, чтобы получить доход и
            восстановить энергию.
          </p>
        </div>
        <div className="grid">
          {specs.map(spec => {
            const noEnergy = state.energy < spec.energy
            const noResources = spec.cost ? !canAfford(state, spec.cost) : false
            return (
              <button
                key={spec.title}
                type="button"
                className="action"
                disabled={noEnergy || noResources || spec.disabled === true}
                onClick={() => dispatch(spec.action)}
              >
                <span className="action__title">{spec.title}</span>
                <span className="action__desc">{spec.desc}</span>
                <span className="action__cost">
                  ⚡{spec.energy}
                  {spec.cost ? `  ·  ${formatCost(spec.cost)}` : ''}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {state.epochModifiers.length > 0 ? (
        <section className="panel">
          <div className="panel__head">
            <h2>{tc.epochName(state.epoch, epochName(state.epoch))}</h2>
            <p>Правила, которые система ввела по ходу партии. Они не отменяются.</p>
          </div>
          {state.epochModifiers.map(id => {
            const modifier = EPOCH_MODIFIER_BY_ID.get(id)
            if (!modifier) return null
            return (
              <div key={id} className="node" style={{ marginBottom: 'var(--sp-2)' }}>
                <div className="node__name">{tc.epoch(modifier.id, 'name', modifier.name)}</div>
                <div className="node__desc">
                  {tc.epoch(modifier.id, 'description', modifier.description)}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Состояние цитадели</h2>
          <p>Итоговые характеристики с учётом модулей, доктрин, технологий и секторов.</p>
        </div>
        <dl className="stat-list">
          <div>
            <dt>Атака</dt>
            <dd>{stats.attack}</dd>
          </div>
          <div>
            <dt>Защита</dt>
            <dd>{stats.defense}</dd>
          </div>
          <div>
            <dt>Пробитие</dt>
            <dd>{stats.pierce}</dd>
          </div>
          <div>
            <dt>Регенерация</dt>
            <dd>{stats.regen}/цикл</dd>
          </div>
          <div>
            <dt>Секторов</dt>
            <dd>{state.controlled.length}</dd>
          </div>
          <div>
            <dt>Подавление</dt>
            <dd>{Math.round(stats.suppression * 100)}%</dd>
          </div>
          <div>
            <dt>Радиус сети</dt>
            <dd>{stats.logistics}</dd>
          </div>
          <div>
            <dt>Потери доставки</dt>
            <dd>{Math.round(stats.logisticsLoss * 100)}%</dd>
          </div>
          <div>
            <dt>Добыча плазмы</dt>
            <dd>+{Math.round(stats.plasmaYield * 100)}%</dd>
          </div>
          <div>
            <dt>Добыча сгустков</dt>
            <dd>+{Math.round(stats.clotYield * 100)}%</dd>
          </div>
          <div>
            <dt>Добыча эссенции</dt>
            <dd>+{Math.round(stats.essenceYield * 100)}%</dd>
          </div>
        </dl>
      </section>
    </>
  )
}
