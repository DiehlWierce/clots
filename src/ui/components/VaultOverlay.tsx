import { getSector } from '@/engine/content'
import { formatIncome } from '../format'
import type { GameAction } from '@/engine/actions'
import type { ContentTranslator } from '@/i18n/content/translate'

interface Props {
  sectorId: string
  dispatch: (action: GameAction) => void
  tc: ContentTranslator
}

export function VaultOverlay({ sectorId, dispatch, tc }: Props) {
  const sector = getSector(sectorId)
  if (!sector?.cache?.length) return null

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Хранилище">
      <div className="overlay__card">
        <div className="overlay__grip" aria-hidden="true" />
        <h2 className="overlay__title">🎁 {tc.sector(sector.id, 'name', sector.name)}</h2>
        <p className="overlay__sub">
          Хранилище вскрыто. Забрать можно только одно — выбор необратим.
        </p>
        <div className="grid">
          {sector.cache.map(option => (
            <button
              key={option.id}
              type="button"
              className="action"
              onClick={() => dispatch({ type: 'vault/choose', optionId: option.id })}
            >
              <span className="action__title">
                {tc.vaultOption(option.id, 'label', option.label)}
              </span>
              <span className="action__desc">
                {tc.vaultOption(option.id, 'description', option.description)}
              </span>
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
