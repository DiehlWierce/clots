import { EVENT_BY_ID } from '@/engine/content'
import { canAfford } from '@/engine/selectors'
import { haptics } from '@/telegram'
import { formatCost } from '../format'
import type { GameAction } from '@/engine/actions'
import type { EventOption, GameState } from '@/engine/types'
import type { ContentTranslator } from '@/i18n/content/translate'

interface Props {
  state: GameState
  eventId: string
  dispatch: (action: GameAction) => void
  tc: ContentTranslator
}

/** Последствия варианта — списком тегов, чтобы цена решения была видна до выбора. */
function outcomeTags(option: EventOption): { text: string; tone: 'good' | 'bad' }[] {
  const tags: { text: string; tone: 'good' | 'bad' }[] = []
  const res = option.resources
  const push = (value: number | undefined, icon: string) => {
    if (!value) return
    tags.push({
      text: `${icon}${value > 0 ? '+' : '−'}${Math.abs(value)}`,
      tone: value > 0 ? 'good' : 'bad',
    })
  }
  push(res?.plasma, '💧')
  push(res?.clots, '🩸')
  push(res?.essence, '✨')
  push(option.integrity, '🫀')
  push(option.energy, '⚡макс ')
  push(option.xp, '🧬')
  if (option.threat) {
    tags.push({
      text: `👁️${option.threat > 0 ? '+' : '−'}${Math.abs(option.threat)}%`,
      tone: option.threat > 0 ? 'bad' : 'good',
    })
  }
  if (option.masking) {
    tags.push({ text: `🌫️+${option.masking}%`, tone: 'good' })
  }
  if (option.fight) tags.push({ text: '⚔️ бой', tone: 'bad' })
  return tags
}

export function EventOverlay({ state, eventId, dispatch, tc }: Props) {
  const event = EVENT_BY_ID.get(eventId)
  if (!event) return null

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={tc.event(event.id, 'title', event.title)}
    >
      <div className="overlay__card">
        <div className="overlay__grip" aria-hidden="true" />
        <h2 className="overlay__title">❗ {tc.event(event.id, 'title', event.title)}</h2>
        <p className="overlay__sub">{tc.event(event.id, 'text', event.text)}</p>

        <div className="grid">
          {event.options.map(option => {
            const affordable = option.requires ? canAfford(state, option.requires) : true
            return (
              <button
                key={option.id}
                type="button"
                className="action"
                disabled={!affordable}
                onClick={() => {
                  haptics.tap()
                  dispatch({ type: 'event/choose', optionId: option.id })
                }}
              >
                <span className="action__title">
                  {tc.eventOption(option.id, 'label', option.label)}
                </span>
                <span className="action__desc">
                  {tc.eventOption(option.id, 'outcome', option.outcome)}
                </span>
                <span className="effects">
                  {outcomeTags(option).map(tag => (
                    <span key={tag.text} className={`tag tag--${tag.tone}`}>
                      {tag.text}
                    </span>
                  ))}
                </span>
                {option.requires && !affordable ? (
                  <span className="action__cost">Нужно: {formatCost(option.requires)}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
