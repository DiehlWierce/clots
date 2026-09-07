import { BALANCE } from '@/engine/balance'
import { getEnemy } from '@/engine/content'
import { mendOutcome } from '@/engine/selectors'
import { currentIntent, effectiveArmor } from '@/engine/systems/combat'
import type { GameAction } from '@/engine/actions'
import type { CombatState, DerivedStats, GameState, PlayerCombatAction } from '@/engine/types'
import type { ContentTranslator } from '@/i18n/content/translate'
import type { Dictionary } from '@/i18n'

interface Props {
  state: GameState
  combat: CombatState
  stats: DerivedStats
  dispatch: (action: GameAction) => void
  tc: ContentTranslator
  t: Dictionary
}

interface MoveSpec {
  action: PlayerCombatAction
  label: string
  hint: string
  /** Почему приём сейчас недоступен. Пусто — доступен. */
  blocked?: string
}

export function CombatOverlay({ state, combat, stats, dispatch, tc, t }: Props) {
  const enemy = getEnemy(combat.enemyId)
  const intent = currentIntent(combat)
  const c = BALANCE.combat
  const hpPercent = (combat.hp / combat.maxHp) * 100
  const recent = state.log.slice(-3).reverse()
  const mend = mendOutcome(state, stats)
  const heal = Math.min(mend.left, Math.round(stats.maxIntegrity * c.mend.share))

  const moves: MoveSpec[] = [
    {
      action: 'strike',
      label: '⚔️ Удар',
      hint: `Обычная атака. Оставляет кровотечение на ${c.strike.bleed} хода.`,
    },
    combat.charging
      ? {
          action: 'super',
          label: '💥 Супер-удар',
          hint: `Замах готов: урон ×${c.super.power}, броня не считается.`,
        }
      : {
          action: 'charge',
          label: '🌀 Замах',
          hint: `Ход без урона, зато входящий удар вполсилы. Следующий ваш — ×${c.super.power}.`,
        },
    {
      action: 'mend',
      label: '🫀 Перевязка',
      hint:
        heal > 0
          ? `Ход на ремонт: +${heal} целостности. Общий бюджет цикла — ${mend.budget}.`
          : 'Ядро приняло весь ремонт этого цикла.',
      ...(heal > 0 ? {} : { blocked: 'бюджет цикла исчерпан' }),
    },
  ]

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Бой">
      <div className="overlay__card">
        <div className="overlay__grip" aria-hidden="true" />
        <h2 className="overlay__title">
          {combat.forced ? t.combat.raid : t.combat.assault} — {t.combat.round} {combat.round}
        </h2>
        <p className="overlay__sub">
          {combat.forced
            ? 'Рейд уже внутри цитадели. Отступление означает прорыв к ядру.'
            : 'Победа закрепит сектор за империей.'}
        </p>

        <div className="enemy">
          <div className="node__head">
            <div>
              <div className="node__name">
                {enemy ? tc.enemy(enemy.id, 'name', enemy.name) : 'Противник'}
              </div>
              <div className="node__desc">
                {enemy ? tc.enemy(enemy.id, 'description', enemy.description) : ''}
              </div>
            </div>
            <span className="node__level">
              {enemy ? tc.enemy(enemy.id, 'title', enemy.title) : ''}
            </span>
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
          </div>

          <div className="effects">
            <span className="tag">
              {combat.hp} / {combat.maxHp} HP
            </span>
            <span className="tag tag--bad">
              {t.combat.armor} {effectiveArmor(combat)}
            </span>
            {combat.statuses.bleed > 0 ? (
              <span className="tag tag--good">
                {t.combat.bleed} {combat.statuses.bleed}
              </span>
            ) : null}
            {enemy?.weakness ? (
              <span className="tag tag--good">
                {t.combat.weakTo}: {moveName(enemy.weakness)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Намерение всегда показано заранее: бой должен читаться, а не угадываться. */}
        {/* Намерение всегда показано заранее: бой должен читаться, а не
            угадываться. Объявленный замах — главный повод замахнуться самому. */}
        <div className="intent" style={combat.enemyCharging ? { borderColor: 'var(--c-bad)' } : {}}>
          <span aria-hidden="true">{combat.enemyCharging ? '⚡' : '🔮'}</span>
          <div>
            <div className="intent__label">
              {combat.enemyCharging
                ? `Замахнулся: сейчас ударит ×${c.enemySuperPower}`
                : `Следующий ход: ${intent.label}`}
            </div>
            <div className="intent__desc">
              {combat.enemyCharging
                ? `Ответьте замахом — удар придёт вполсилы (×${Math.round(c.enemySuperPower * (1 - c.charge.mitigation) * 10) / 10}), и ваш следующий пробьёт броню.`
                : intent.description}
            </div>
          </div>
        </div>

        <div className="effects" style={{ marginBottom: 'var(--sp-3)' }}>
          <span className="tag">
            ⚡ {state.energy} / {stats.maxEnergy}
          </span>
          <span className="tag">🫀 {state.integrity}</span>
          <span className="tag">🩸 {state.clots}</span>
          {combat.charging ? <span className="tag tag--good">замах готов</span> : null}
        </div>

        <div className="moves">
          {moves.map(move => {
            return (
              <button
                key={move.action}
                type="button"
                className="move"
                disabled={move.blocked !== undefined}
                onClick={() => dispatch({ type: 'combat/act', action: move.action })}
              >
                <span className="move__title">{move.label}</span>
                <span className="move__hint">{move.hint}</span>
                <span className="move__cost">{move.blocked ?? t.combat.free}</span>
              </button>
            )
          })}
        </div>

        {/* Короткая история: в бою был виден только последний ход, и понять,
            что произошло за раунд, было нельзя. */}
        {recent.length > 0 ? (
          <ul className="combat-log">
            {recent.map(entry => (
              <li key={entry.id} className={`combat-log__row combat-log__row--${entry.tone}`}>
                {entry.message}
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          className="btn btn--danger btn--block"
          onClick={() => dispatch({ type: 'combat/withdraw' })}
        >
          {combat.forced
            ? `${t.combat.breach} (−${BALANCE.threat.raidBreachDamage})`
            : `${t.combat.withdraw} (+${c.withdraw.threatPenalty}%)`}
        </button>
      </div>
    </div>
  )
}

function moveName(action: 'strike' | 'super'): string {
  return action === 'super' ? 'супер-удар' : 'удар'
}
