import { BALANCE } from '@/engine/balance'
import { getEnemy } from '@/engine/content'
import { canAfford } from '@/engine/selectors'
import { currentIntent, effectiveArmor, momentumCost } from '@/engine/systems/combat'
import type { GameAction } from '@/engine/actions'
import type { CombatState, DerivedStats, GameState, PlayerCombatAction } from '@/engine/types'

interface Props {
  state: GameState
  combat: CombatState
  stats: DerivedStats
  dispatch: (action: GameAction) => void
}

interface MoveSpec {
  action: PlayerCombatAction
  label: string
  hint: string
  cost?: { clots: number }
}

/** Полоса импульса: ресурс копится ударами и тратится на сильные приёмы. */
function MomentumBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="momentum" title="Импульс: копится ударами, тратится на сильные приёмы">
      <span className="momentum__label">Импульс</span>
      <div
        className="momentum__pips"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label="Импульс"
      >
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`momentum__pip${i < value ? ' momentum__pip--on' : ''}`} />
        ))}
      </div>
      <span className="momentum__value">
        {value}/{max}
      </span>
    </div>
  )
}

export function CombatOverlay({ state, combat, stats, dispatch }: Props) {
  const enemy = getEnemy(combat.enemyId)
  const intent = currentIntent(combat)
  const c = BALANCE.combat
  const hpPercent = (combat.hp / combat.maxHp) * 100
  const shieldPercent = Math.min(100 - hpPercent, (combat.shield / combat.maxHp) * 100)

  const moves: MoveSpec[] = [
    {
      action: 'strike',
      label: '⚔️ Пульс-удар',
      hint: `Атака и кровотечение на ${c.strike.bleed} хода. +${c.momentum.perStrike} импульса.`,
    },
    {
      action: 'surge',
      label: '💥 Гемо-всплеск',
      hint: `Урон ×${c.surge.power}. Тратит импульс и сгустки.`,
      cost: c.surge.cost,
    },
    {
      action: 'rupture',
      label: '🔧 Вскрытие',
      hint: `Срывает щит, снимает броню, разъедает её навсегда. Шанс оглушить.`,
    },
    {
      action: 'focus',
      label: '🎯 Фокус',
      hint: `Следующий удар ×${c.focus.multiplier}. +${c.momentum.perFocus} импульса.`,
    },
    {
      action: 'guard',
      label: '🛡️ Щит',
      hint: `Урон следующего хода −${Math.round(c.guard.reduction * 100)}%. +${c.momentum.perGuard} импульса.`,
    },
  ]

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Бой">
      <div className="overlay__card">
        <div className="overlay__grip" aria-hidden="true" />
        <h2 className="overlay__title">
          {combat.forced ? '🚨 Иммунный рейд' : '⚔️ Штурм'} — раунд {combat.round}
        </h2>
        <p className="overlay__sub">
          {combat.forced
            ? 'Рейд уже внутри цитадели. Отступление означает прорыв к ядру.'
            : 'Победа закрепит сектор за империей.'}
        </p>

        <div className="enemy">
          <div className="node__head">
            <div>
              <div className="node__name">{enemy?.name ?? 'Противник'}</div>
              <div className="node__desc">{enemy?.description}</div>
            </div>
            <span className="node__level">{enemy?.title}</span>
          </div>

          <div
            className="enemy__bar"
            role="meter"
            aria-valuenow={combat.hp}
            aria-valuemin={0}
            aria-valuemax={combat.maxHp}
            aria-label="Здоровье противника"
          >
            <div className="enemy__hp" style={{ width: `${hpPercent}%` }} />
            {combat.shield > 0 ? (
              <div className="enemy__shield" style={{ width: `${shieldPercent}%` }} />
            ) : null}
          </div>

          <div className="effects">
            <span className="tag">
              {combat.hp} / {combat.maxHp} HP
            </span>
            {combat.shield > 0 ? <span className="tag tag--info">щит {combat.shield}</span> : null}
            <span className="tag tag--bad">броня {effectiveArmor(combat)}</span>
            {combat.statuses.corrode > 0 ? (
              <span className="tag tag--good">разъедание {combat.statuses.corrode}</span>
            ) : null}
            {combat.statuses.bleed > 0 ? (
              <span className="tag tag--good">кровотечение {combat.statuses.bleed}</span>
            ) : null}
            {combat.statuses.stun > 0 ? <span className="tag tag--good">оглушён</span> : null}
            {enemy?.weakness ? (
              <span className="tag tag--good">уязвим: {moveName(enemy.weakness)}</span>
            ) : null}
          </div>
        </div>

        {/* Намерение всегда показано заранее: бой должен читаться, а не угадываться. */}
        <div className="intent">
          <span aria-hidden="true">{combat.statuses.stun > 0 ? '💫' : '🔮'}</span>
          <div>
            <div className="intent__label">
              {combat.statuses.stun > 0
                ? 'Оглушён: пропустит ход'
                : `Следующий ход: ${intent.label}`}
            </div>
            <div className="intent__desc">{intent.description}</div>
          </div>
        </div>

        <MomentumBar value={combat.momentum} max={c.momentum.max} />

        <div className="effects" style={{ marginBottom: 'var(--sp-3)' }}>
          <span className="tag">
            ⚡ {state.energy} / {stats.maxEnergy}
          </span>
          <span className="tag">🫀 {state.integrity}</span>
          <span className="tag">🩸 {state.clots}</span>
          {combat.focused ? <span className="tag tag--good">фокус активен</span> : null}
          {combat.guarded ? <span className="tag tag--good">щит поднят</span> : null}
        </div>

        <div className="moves">
          {moves.map(move => {
            const need = momentumCost(move.action)
            const noMomentum = combat.momentum < need
            const noClots = move.cost ? !canAfford(state, move.cost) : false
            const price = [need > 0 ? `⚡︎${need}` : null, move.cost ? `🩸${move.cost.clots}` : null]
              .filter(Boolean)
              .join('  ·  ')
            return (
              <button
                key={move.action}
                type="button"
                className="move"
                disabled={noMomentum || noClots}
                onClick={() => dispatch({ type: 'combat/act', action: move.action })}
              >
                <span className="move__title">{move.label}</span>
                <span className="move__hint">{move.hint}</span>
                <span className="move__cost">{price || 'без затрат'}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="btn btn--danger btn--block"
          onClick={() => dispatch({ type: 'combat/withdraw' })}
        >
          {combat.forced
            ? `🏳️ Пропустить удар (−${BALANCE.threat.raidBreachDamage} целостности)`
            : `🏳️ Отступить (+${c.withdraw.threatPenalty}% угрозы)`}
        </button>
      </div>
    </div>
  )
}

function moveName(action: PlayerCombatAction): string {
  const names: Record<PlayerCombatAction, string> = {
    strike: 'пульс-удар',
    surge: 'гемо-всплеск',
    focus: 'фокус',
    guard: 'щит',
    rupture: 'вскрытие',
  }
  return names[action]
}
