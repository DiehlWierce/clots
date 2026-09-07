import { useState } from 'react'
import { ACHIEVEMENTS, ALL_CHAPTERS, LORE } from '@/engine/content'
import { isAchievementEarned } from '@/engine/selectors'
import { haptics } from '@/telegram'
import type { GameState } from '@/engine/types'

type Section = 'journal' | 'lore' | 'achievements'

/**
 * Журнал, летопись и достижения объединены в одну вкладку: на телефоне в
 * нижнюю панель помещается пять пунктов, а не семь.
 */
export function ChronicleTab({ state }: { state: GameState }) {
  const [section, setSection] = useState<Section>('journal')

  const unlockedLore = new Set(state.lore)
  const doneCount = ACHIEVEMENTS.filter(a => isAchievementEarned(state, a.id)).length

  const sections: { id: Section; label: string }[] = [
    { id: 'journal', label: 'Журнал' },
    { id: 'lore', label: `Летопись ${unlockedLore.size}/${ALL_CHAPTERS.length}` },
    { id: 'achievements', label: `Награды ${doneCount}/${ACHIEVEMENTS.length}` },
  ]

  return (
    <section className="panel">
      <div className="segmented" role="tablist" style={{ marginBottom: 'var(--sp-3)' }}>
        {sections.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="segmented__item"
            aria-selected={section === item.id}
            onClick={() => {
              setSection(item.id)
              haptics.select()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'journal' &&
        (state.log.length === 0 ? (
          <p className="muted">Журнал пуст.</p>
        ) : (
          <div className="log">
            {state.log.map(entry => (
              <div key={entry.id} className={`log__row log__row--${entry.tone}`}>
                <span className="log__cycle">Ц{entry.cycle}</span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        ))}

      {section === 'lore' &&
        LORE.map(era => (
          <div key={era.id} className="era">
            <div className="region__title">
              <h3>{era.title}</h3>
              <span className="region__meta">{era.period}</span>
            </div>
            <p className="region__desc">{era.summary}</p>
            {era.chapters.map(chapter =>
              unlockedLore.has(chapter.id) ? (
                <article key={chapter.id} className="chapter">
                  <h4>{chapter.title}</h4>
                  {chapter.paragraphs.map((text, i) => (
                    <p key={i}>{text}</p>
                  ))}
                </article>
              ) : (
                <article key={chapter.id} className="chapter chapter--locked">
                  <h4>🔒 Глава ещё не написана</h4>
                  <p>Продвиньте империю дальше, чтобы летопись пополнилась.</p>
                </article>
              ),
            )}
          </div>
        ))}

      {section === 'achievements' && (
        <div className="grid">
          {ACHIEVEMENTS.map(a => {
            const value = state.achievements[a.id] ?? 0
            const complete = isAchievementEarned(state, a.id)
            const hidden = a.secret === true && !complete
            return (
              <div key={a.id} className={`ach${complete ? ' ach--done' : ''}`}>
                <span className="ach__icon" aria-hidden="true">
                  {complete ? '🏆' : hidden ? '❓' : '⬚'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="ach__title">{hidden ? 'Секретное достижение' : a.title}</div>
                  <div className="ach__desc">
                    {hidden ? 'Условие станет известно, когда оно выполнится.' : a.description}
                  </div>
                  {a.target && !complete ? (
                    <>
                      <div className="meter" style={{ marginTop: 6 }}>
                        <div
                          className="meter__fill"
                          style={{
                            width: `${Math.min(100, (value / a.target) * 100)}%`,
                            background: 'var(--c-accent)',
                          }}
                        />
                      </div>
                      <div className="ach__desc" style={{ marginTop: 4 }}>
                        {Math.min(value, a.target)} / {a.target}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
