import { BALANCE } from '@/engine/balance'
import { formatNumber } from '../format'
import type { DerivedStats, GameState } from '@/engine/types'

interface Props {
  state: GameState
  stats: DerivedStats
}

function Resource({
  kind,
  icon,
  label,
  value,
  delta,
}: {
  kind: string
  icon: string
  label: string
  value: string
  delta?: string
}) {
  return (
    <div className={`res res--${kind}`}>
      <span className="res__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="res__value">
        <span className="sr-only">{label}: </span>
        {value}
      </span>
      <span className="res__delta">{delta ?? ' '}</span>
    </div>
  )
}

function Gauge({
  icon,
  label,
  value,
  max,
  display,
  color,
}: {
  icon: string
  label: string
  value: number
  max: number
  display: string
  color: string
}) {
  return (
    <div className="gauge" title={label}>
      <div className="gauge__top">
        {/* На 375px полные подписи не помещаются: имя шкалы несёт иконка,
            а полное название остаётся в title и aria-label. */}
        <span className="gauge__label" aria-hidden="true">
          {icon}
        </span>
        <span className="gauge__value">{display}</span>
      </div>
      <div
        className="meter"
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-label={label}
      >
        <div
          className="meter__fill"
          style={{
            width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Шапка рассчитана на 320px: четыре числа в ряд и три шкалы под ними.
 * В прошлой раскладке восемь плашек вставали в столбик и занимали на телефоне
 * весь первый экран.
 */
export function Hud({ state, stats }: Props) {
  const xp = stats.xpForLevel > 0 ? `${stats.xpInLevel}/${stats.xpForLevel}` : 'макс'

  return (
    <header className="hud">
      <div className="hud__top">
        <div className="hud__brand">
          Clots: <span>Hem Empire</span>
        </div>
        <div className="hud__meta">
          <span>Цикл {state.cycle}</span>
          <span>
            Ур. {stats.level} · {xp}
          </span>
        </div>
      </div>

      <div className="res-row">
        <Resource
          kind="plasma"
          icon="💧"
          label="Плазма"
          value={formatNumber(state.plasma)}
          delta={`+${stats.income.plasma}`}
        />
        <Resource
          kind="clots"
          icon="🩸"
          label="Сгустки"
          value={formatNumber(state.clots)}
          {...(stats.income.clots > 0 ? { delta: `+${stats.income.clots}` } : {})}
        />
        <Resource
          kind="essence"
          icon="✨"
          label="Эссенция"
          value={formatNumber(state.essence)}
          {...(stats.income.essence > 0 ? { delta: `+${stats.income.essence}` } : {})}
        />
        <Resource
          kind="energy"
          icon="⚡"
          label="Энергия"
          value={`${state.energy}/${stats.maxEnergy}`}
        />
      </div>

      <div className="gauge-row">
        <Gauge
          icon="🫀"
          label="Целостность"
          value={state.integrity}
          max={stats.maxIntegrity}
          display={`${state.integrity}/${stats.maxIntegrity}`}
          color="var(--c-integrity)"
        />
        <Gauge
          icon="👁️"
          label="Угроза"
          value={state.threat}
          max={BALANCE.threat.max}
          display={`${Math.round(state.threat)}%`}
          color="var(--c-threat)"
        />
        <Gauge
          icon="🌫️"
          label="Маскировка"
          value={state.masking}
          max={BALANCE.masking.max}
          display={`${Math.round(state.masking)}%`}
          color="var(--c-masking)"
        />
      </div>
    </header>
  )
}
