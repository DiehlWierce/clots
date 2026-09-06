import { getSector } from '@/engine/content'
import { formatIncome } from '../format'
import type { GameAction } from '@/engine/actions'

interface Props {
  sectorId: string
  dispatch: (action: GameAction) => void
}

export function VaultOverlay({ sectorId, dispatch }: Props) {
  const sector = getSector(sectorId)
  if (!sector?.cache?.length) return null

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Хранилище">
      <div className="overlay__card">
        <h2 className="overlay__title">🎁 {sector.name}</h2>
        <p className="overlay__sub">
          Хранилище вскрыто. Забрать можно только одно — выбор необратим.
        </p>
        <div className="grid grid--wide">
          {sector.cache.map(option => (
            <button
              key={option.id}
              type="button"
              className="action"
              onClick={() => dispatch({ type: 'vault/choose', optionId: option.id })}
            >
              <span className="action__title">{option.label}</span>
              <span className="action__desc">{option.description}</span>
              <span className="effects">
                {formatIncome(option.reward).map(item => (
                  <span key={item} className="tag tag--good">
                    {item}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
