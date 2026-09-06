import { ACHIEVEMENTS, ALL_CHAPTERS, LORE } from '@/engine/content'
import type { GameState } from '@/engine/types'

export function JournalTab({ state }: { state: GameState }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Журнал</h2>
        <p>Последние {state.log.length} событий империи.</p>
      </div>
      {state.log.length === 0 ? (
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
      )}
    </section>
  )
}

export function LoreTab({ state }: { state: GameState }) {
  const unlocked = new Set(state.lore)
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Летопись</h2>
        <p>
          Открыто глав: {unlocked.size} из {ALL_CHAPTERS.length}. Главы появляются по мере
          продвижения империи.
        </p>
      </div>
      {LORE.map(era => (
        <div key={era.id} className="era">
          <div className="region__title">
            <h3>{era.title}</h3>
            <span className="region__meta">{era.period}</span>
          </div>
          <p className="region__desc">{era.summary}</p>
          {era.chapters.map(chapter =>
            unlocked.has(chapter.id) ? (
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
    </section>
  )
}

export function AchievementsTab({ state }: { state: GameState }) {
  const done = ACHIEVEMENTS.filter(a => {
    const value = state.achievements[a.id] ?? 0
    return a.target ? value >= a.target : value > 0
  }).length

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Достижения</h2>
        <p>
          Получено {done} из {ACHIEVEMENTS.length}.
        </p>
      </div>
      <div className="grid grid--wide">
        {ACHIEVEMENTS.map(a => {
          const value = state.achievements[a.id] ?? 0
          const complete = a.target ? value >= a.target : value > 0
          const hidden = a.secret === true && !complete
          return (
            <div key={a.id} className={`ach${complete ? ' ach--done' : ''}`}>
              <span className="ach__icon">{complete ? '🏆' : hidden ? '❓' : '⬚'}</span>
              <div>
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
    </section>
  )
}
