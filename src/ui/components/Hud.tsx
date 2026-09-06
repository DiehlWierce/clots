import { BALANCE } from '@/engine/balance'
import { formatNumber } from '../format'
import type { DerivedStats, GameState } from '@/engine/types'

interface Props {
  state: GameState
  stats: DerivedStats
}

interface ResourceProps {
  kind: string
  label: string
  value: string
  delta?: string | undefined
  meter?: { value: number; max: number; color: string } | undefined
  title: string
}

function Resource({ kind, label, value, delta, meter, title }: ResourceProps) {
  return (
    <div className={`res res--${kind}`} title={title}>
      <span className="res__label">{label}</span>
      <span className="res__value">{value}</span>
      {delta ? <span className="res__delta">{delta}</span> : null}
      {meter ? (
        <div
          className="meter"
          role="meter"
          aria-valuenow={Math.round(meter.value)}
          aria-valuemin={0}
          aria-valuemax={Math.round(meter.max)}
          aria-label={label}
        >
          <div
            className="meter__fill"
            style={{
              width: `${Math.min(100, (meter.value / Math.max(1, meter.max)) * 100)}%`,
              background: meter.color,
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

export function Hud({ state, stats }: Props) {
  const xpLabel = stats.xpForLevel > 0 ? `${stats.xpInLevel} / ${stats.xpForLevel}` : 'максимум'

  return (
    <header className="hud">
      <div className="hud__top">
        <div className="hud__brand">
          Clots: <span>Hem Empire</span>
        </div>
        <div className="hud__cycle">
          <span>Цикл {state.cycle}</span>
          <span>
            Уровень {stats.level} · {xpLabel} XP
          </span>
        </div>
      </div>

      <div className="resources">
        <Resource
          kind="plasma"
          label="Плазма"
          value={formatNumber(state.plasma)}
          delta={`+${stats.income.plasma}/цикл`}
          title="Базовое сырьё. Приходит с секторов добычи каждый цикл."
        />
        <Resource
          kind="clots"
          label="Сгустки"
          value={formatNumber(state.clots)}
          delta={stats.income.clots > 0 ? `+${stats.income.clots}/цикл` : undefined}
          title="Строительный материал модулей и топливо гемо-всплеска."
        />
        <Resource
          kind="essence"
          label="Эссенция"
          value={formatNumber(state.essence)}
          delta={stats.income.essence > 0 ? `+${stats.income.essence}/цикл` : undefined}
          title="Редкий ресурс: доктрины, технологии, восстановление ядра."
        />
        <Resource
          kind="energy"
          label="Энергия"
          value={`${state.energy} / ${stats.maxEnergy}`}
          meter={{ value: state.energy, max: stats.maxEnergy, color: 'var(--c-energy)' }}
          title="Очки действий на цикл. Полностью восстанавливаются в конце цикла."
        />
        <Resource
          kind="integrity"
          label="Целостность"
          value={`${state.integrity} / ${stats.maxIntegrity}`}
          delta={stats.regen > 0 ? `+${stats.regen}/цикл` : undefined}
          meter={{ value: state.integrity, max: stats.maxIntegrity, color: 'var(--c-integrity)' }}
          title="Здоровье цитадели. На нуле — коллапс империи."
        />
        <Resource
          kind="threat"
          label="Угроза"
          value={`${state.threat}%`}
          delta={`+${stats.threatGain}/цикл`}
          meter={{ value: state.threat, max: 100, color: 'var(--c-threat)' }}
          title={`Внимание иммунной системы. С ${BALANCE.threat.raidThreshold}% начинаются рейды.`}
        />
        <Resource
          kind="masking"
          label="Маскировка"
          value={`${state.masking}%`}
          delta={`${stats.maskingGain - BALANCE.masking.decay >= 0 ? '+' : ''}${
            Math.round((stats.maskingGain - BALANCE.masking.decay) * 10) / 10
          }/цикл`}
          meter={{ value: state.masking, max: 100, color: 'var(--c-masking)' }}
          title="Снижает прирост угрозы. Естественно деградирует каждый цикл."
        />
      </div>
    </header>
  )
}
