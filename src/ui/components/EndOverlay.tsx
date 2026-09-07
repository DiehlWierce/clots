import { SECTORS } from '@/engine/content'
import { haptics, shareRun } from '@/telegram'
import type { GameState } from '@/engine/types'

interface Props {
  state: GameState
  onRestart: () => void
  onNewGamePlus: () => void
}

/**
 * Экран конца партии.
 *
 * Кнопка перезапуска живёт прямо здесь, в модальном окне поверх всего, —
 * чтобы её нельзя было запереть ни вкладкой, ни режимом обучения, ни чем-либо
 * ещё. В v1 сообщение «запустите сброс» показывалось при заблокированной
 * вкладке со сбросом, и сейв становился невосстановимым.
 */
export function EndOverlay({ state, onRestart, onNewGamePlus }: Props) {
  const victory = state.phase === 'victory'
  const s = state.stats

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Итоги партии">
      <div className="overlay__card">
        <div className="overlay__grip" aria-hidden="true" />
        <h2 className="overlay__title">{victory ? '👑 Империя восторжествовала' : '💀 Коллапс'}</h2>
        <p className="overlay__sub">
          {victory
            ? 'Суверен Иммунис низложен. Кровь стала разумом, который её носит.'
            : 'Целостность ядра исчерпана. Империя рассыпалась по руслам — но поток остался.'}
        </p>

        <dl className="stat-list" style={{ marginBottom: 'var(--sp-4)' }}>
          <div>
            <dt>Циклов</dt>
            <dd>{state.cycle}</dd>
          </div>
          {state.ngPlus > 0 ? (
            <div>
              <dt>Порядок цикла</dt>
              <dd>{state.ngPlus + 1}</dd>
            </div>
          ) : null}
          <div>
            <dt>Секторов</dt>
            <dd>
              {state.controlled.length} / {SECTORS.length}
            </dd>
          </div>
          <div>
            <dt>Побед</dt>
            <dd>{s.battlesWon}</dd>
          </div>
          <div>
            <dt>Рейдов отбито</dt>
            <dd>{s.raidsSurvived}</dd>
          </div>
          <div>
            <dt>Секторов потеряно</dt>
            <dd>{s.sectorsLost}</dd>
          </div>
          <div>
            <dt>Лучшая серия</dt>
            <dd>{s.bestStreak}</dd>
          </div>
          <div>
            <dt>Урона нанесено</dt>
            <dd>{s.damageDealt}</dd>
          </div>
          <div>
            <dt>Урона получено</dt>
            <dd>{s.damageTaken}</dd>
          </div>
          <div>
            <dt>Плазмы добыто</dt>
            <dd>{s.plasmaEarned}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="btn btn--block"
          style={{ marginBottom: 'var(--sp-2)' }}
          onClick={() => {
            haptics.tap()
            shareRun(state, SECTORS.length)
          }}
        >
          📤 Поделиться итогом
        </button>

        {victory ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={onNewGamePlus}
              style={{ marginBottom: 'var(--sp-2)' }}
            >
              ♾️ Цикл {state.ngPlus + 2}-го порядка
            </button>
            <p className="muted" style={{ marginBottom: 'var(--sp-3)', textAlign: 'center' }}>
              Половина технологий переносится, гарнизоны становятся тяжелее.
            </p>
          </>
        ) : null}
        <button
          type="button"
          className={`btn btn--block${victory ? '' : ' btn--primary'}`}
          onClick={onRestart}
        >
          🔄 Начать с чистого листа
        </button>
      </div>
    </div>
  )
}
