import { MUTATION_BY_ID } from '@/engine/content'
import { haptics } from '@/telegram'
import { formatEffects } from '../format'
import type { GameAction } from '@/engine/actions'

interface Props {
  offer: string[]
  dispatch: (action: GameAction) => void
}

/**
 * Выбор стартовой мутации — первое, что видит игрок.
 *
 * Решение принимается до первого хода и действует всю партию, поэтому
 * компромисс каждой мутации показывается явно: и плюсы, и минусы одним списком.
 */
export function MutationOverlay({ offer, dispatch }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Выбор мутации">
      <div className="overlay__card">
        <div className="overlay__grip" aria-hidden="true" />
        <h2 className="overlay__title">🧬 Форма империи</h2>
        <p className="overlay__sub">
          Поток сомкнулся не там, где обычно. Выберите, какой уродилась ваша кровь — это решение
          действует всю партию.
        </p>

        <div className="grid">
          {offer.map(id => {
            const mutation = MUTATION_BY_ID.get(id)
            if (!mutation) return null
            const effects = formatEffects(mutation.effects)
            return (
              <button
                key={id}
                type="button"
                className="action"
                onClick={() => {
                  haptics.capture()
                  dispatch({ type: 'mutation/choose', id })
                }}
              >
                <span className="action__title">{mutation.name}</span>
                <span className="action__desc">{mutation.description}</span>
                <span className="effects">
                  {effects.map(text => (
                    <span
                      key={text}
                      className={`tag ${text.includes('−') || text.includes('-') ? 'tag--bad' : 'tag--good'}`}
                    >
                      {text}
                    </span>
                  ))}
                  {mutation.heatMultiplier !== undefined ? (
                    <span
                      className={`tag ${mutation.heatMultiplier > 1 ? 'tag--bad' : 'tag--good'}`}
                    >
                      Шум ×{mutation.heatMultiplier}
                    </span>
                  ) : null}
                  {mutation.raidPower !== undefined ? (
                    <span className="tag tag--bad">Сила рейдов ×{mutation.raidPower}</span>
                  ) : null}
                  {mutation.startThreat !== undefined ? (
                    <span className="tag tag--bad">Старт с угрозой {mutation.startThreat}%</span>
                  ) : null}
                  {mutation.startBonus ? (
                    <span className="tag tag--good">Богатый старт</span>
                  ) : null}
                </span>
                <span className="action__cost">{mutation.tagline}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
