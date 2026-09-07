import { MUTATION_BY_ID } from '@/engine/content'
import { haptics } from '@/telegram'
import { formatEffects } from '../format'
import type { GameAction } from '@/engine/actions'
import type { ContentTranslator } from '@/i18n/content/translate'
import type { Dictionary } from '@/i18n'

interface Props {
  offer: string[]
  dispatch: (action: GameAction) => void
  tc: ContentTranslator
  t: Dictionary
}

/**
 * Выбор стартовой мутации — первое, что видит игрок.
 *
 * Решение принимается до первого хода и действует всю партию, поэтому
 * компромисс каждой мутации показывается явно: и плюсы, и минусы одним списком.
 */
export function MutationOverlay({ offer, dispatch, tc, t }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t.mutation.title}>
      <div className="overlay__card">
        <div className="overlay__grip" aria-hidden="true" />
        <h2 className="overlay__title">{t.mutation.title}</h2>
        <p className="overlay__sub">{t.mutation.subtitle}</p>

        <div className="grid">
          {offer.map(id => {
            const mutation = MUTATION_BY_ID.get(id)
            if (!mutation) return null
            const effects = formatEffects(mutation.effects, t.effects)
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
                <span className="action__title">{tc.mutation(id, 'name', mutation.name)}</span>
                <span className="action__desc">
                  {tc.mutation(id, 'description', mutation.description)}
                </span>
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
                      {t.effects.heat} ×{mutation.heatMultiplier}
                    </span>
                  ) : null}
                  {mutation.raidPower !== undefined ? (
                    <span className="tag tag--bad">
                      {t.effects.raidPower} ×{mutation.raidPower}
                    </span>
                  ) : null}
                  {mutation.startThreat !== undefined ? (
                    <span className="tag tag--bad">
                      {t.effects.startThreat} {mutation.startThreat}%
                    </span>
                  ) : null}
                  {mutation.startBonus ? (
                    <span className="tag tag--good">{t.effects.richStart}</span>
                  ) : null}
                </span>
                <span className="action__cost">{tc.mutation(id, 'tagline', mutation.tagline)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
