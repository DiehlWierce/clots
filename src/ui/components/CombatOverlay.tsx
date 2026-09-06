import { BALANCE } from '@/engine/balance'
import { getEnemy } from '@/engine/content'
import { canAfford } from '@/engine/selectors'
import { currentIntent, effectiveArmor } from '@/engine/systems/combat'
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

export function CombatOverlay({ state, combat, stats, dispatch }: Props) {
  const enemy = getEnemy(combat.enemyId)
  const intent = currentIntent(combat)
  const c = BALANCE.combat
  const hpPercent = (combat.hp / combat.maxHp) * 100
  const shieldPercent = Math.min(100 - hpPercent, (combat.shield / combat.maxHp) * 100)

  const moves: MoveSpec[] = [
    { action: 'strike', label: '⚔️ Пульс-удар', hint: 'Базовая атака без затрат.' },
    {
      action: 'surge',
      label: '💥 Гемо-всплеск',
      hint: `Урон ×${c.surge.power} за сгустки.`,
      cost: c.surge.cost,
    },
    {
      action: 'rupture',
      label: '🔧 Вскрытие',
      hint: `Срывает щит целиком и снимает ${c.rupture.armorBreak} брони.`,
    },
    { action: 'focus', label: '🎯 Фокус', hint: `Следующий удар ×${c.focus.multiplier}.` },
    {
      action: 'guard',
      label: '🛡️ Щит',
      hint: `Урон следующего хода −${Math.round(c.guard.reduction * 100)}%.`,
    },
  ]

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Бой">
      <div className="overlay__card">
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
            {enemy?.weakness ? (
              <span className="tag tag--good">уязвим: {moveName(enemy.weakness)}</span>
            ) : null}
          </div>
        </div>

        {/* Намерение всегда показано заранее: бой должен читаться, а не угадываться. */}
        <div className="intent">
          <span aria-hidden="true">🔮</span>
          <div>
            <div className="intent__label">Следующий ход: {intent.label}</div>
            <div className="intent__desc">{intent.description}</div>
          </div>
        </div>

        <div className="effects" style={{ marginBottom: 'var(--sp-3)' }}>
          <span className="tag">
            ⚡ {state.energy} / {stats.maxEnergy}
          </span>
          <span className="tag">🫀 {state.integrity}</span>
          <span className="tag">🩸 {state.clots}</span>
          {combat.focused ? <span className="tag tag--good">фокус активен</span> : null}
          {combat.guarded ? <span className="tag tag--good">щит поднят</span> : null}
        </div>

        <div className="grid" style={{ marginBottom: 'var(--sp-3)' }}>
          {moves.map(move => (
            <button
              key={move.action}
              type="button"
              className="action"
              disabled={move.cost ? !canAfford(state, move.cost) : false}
              onClick={() => dispatch({ type: 'combat/act', action: move.action })}
            >
              <span className="action__title">{move.label}</span>
              <span className="action__desc">{move.hint}</span>
              <span className="action__cost">
                {move.cost ? `🩸${move.cost.clots}` : 'без затрат'}
              </span>
            </button>
          ))}
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
