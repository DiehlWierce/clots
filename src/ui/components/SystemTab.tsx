import { useState } from 'react'
import { decodeSaveCode, encodeSaveCode } from '@/engine/save'
import type { GameState } from '@/engine/types'

interface Props {
  state: GameState
  onLoad: (state: GameState) => void
  onRestart: () => void
}

const REASONS: Record<string, string> = {
  empty: 'Код пустой — вставьте его в поле.',
  corrupt: 'Код повреждён или это не код сохранения.',
  incompatible: 'Код от несовместимой версии игры.',
}

export function SystemTab({ state, onLoad, onRestart }: Props) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const generate = () => {
    const generated = encodeSaveCode(state)
    setCode(generated)
    setStatus({ text: `Код готов: ${generated.length} символов.`, ok: true })
  }

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setStatus({ text: 'Код скопирован в буфер обмена.', ok: true })
    } catch {
      setStatus({ text: 'Браузер не дал доступ к буферу — скопируйте вручную.', ok: false })
    }
  }

  const load = () => {
    const result = decodeSaveCode(code)
    if (result.ok) {
      onLoad(result.state)
      setStatus({ text: 'Сохранение загружено.', ok: true })
    } else {
      setStatus({ text: REASONS[result.reason] ?? 'Не удалось загрузить код.', ok: false })
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel__head">
          <h2>Сохранения</h2>
          <p>Прогресс сохраняется автоматически. Код нужен, чтобы перенести партию.</p>
        </div>
        <div className="field">
          <label htmlFor="save-code" className="muted">
            Код сохранения
          </label>
          <textarea
            id="save-code"
            value={code}
            spellCheck={false}
            placeholder="Нажмите «Сгенерировать» или вставьте сюда код"
            onChange={event => setCode(event.target.value)}
          />
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={generate}>
              💾 Сгенерировать
            </button>
            <button type="button" className="btn" disabled={!code} onClick={() => void copy()}>
              📋 Скопировать
            </button>
            <button type="button" className="btn" disabled={!code} onClick={load}>
              📥 Загрузить
            </button>
          </div>
          {status ? (
            <p className="muted" style={{ color: status.ok ? 'var(--c-good)' : 'var(--c-bad)' }}>
              {status.text}
            </p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Новая партия</h2>
          <p>Сброс стирает прогресс и выдаёт новое зерно генерации.</p>
        </div>
        {confirmReset ? (
          <div className="row">
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                onRestart()
                setConfirmReset(false)
              }}
            >
              Да, стереть прогресс
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
              Отмена
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--danger" onClick={() => setConfirmReset(true)}>
            🔄 Начать заново
          </button>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Как играть</h2>
          <p>Коротко о правилах, которые не очевидны.</p>
        </div>
        <details className="chapter" open>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Цикл — это ход</summary>
          <p>
            Энергия — очки действий на цикл. Потратили — завершайте цикл: придёт доход с секторов,
            энергия восстановится полностью, а угроза подрастёт.
          </p>
        </details>
        <details className="chapter">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Территория стоит внимания
          </summary>
          <p>
            Каждый захваченный сектор даёт доход, но добавляет «шум» — постоянный прирост угрозы. С{' '}
            60% начинаются рейды: чем выше угроза, тем чаще и сильнее. Расширяться бесплатно нельзя.
          </p>
        </details>
        <details className="chapter">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Маскировка работает всегда
          </summary>
          <p>
            Маскировка и подавление режут прирост угрозы мультипликативно, но не более чем на 75%.
            Полностью отключить давление невозможно ни одной сборкой.
          </p>
        </details>
        <details className="chapter">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Бой читается заранее</summary>
          <p>
            Противник всегда показывает следующее намерение. «Тяжёлый выпад» — ставьте щит,
            «Экранирование» — бейте вскрытием, у каждого врага есть уязвимость к конкретному
            действию (урон ×1.5).
          </p>
        </details>
        <details className="chapter">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Путь выбирается один раз</summary>
          <p>
            Первая принятая доктрина закрывает два других пути до конца партии. Разоритель — урон,
            Хранитель — выживание, Ткач — экономика и скрытность.
          </p>
        </details>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Статистика партии</h2>
        </div>
        <dl className="stat-list">
          <div>
            <dt>Зерно</dt>
            <dd>{state.seed}</dd>
          </div>
          <div>
            <dt>Побед</dt>
            <dd>{state.stats.battlesWon}</dd>
          </div>
          <div>
            <dt>Поражений</dt>
            <dd>{state.stats.battlesLost}</dd>
          </div>
          <div>
            <dt>Рейдов отбито</dt>
            <dd>{state.stats.raidsSurvived}</dd>
          </div>
          <div>
            <dt>Лучшая серия</dt>
            <dd>{state.stats.bestStreak}</dd>
          </div>
          <div>
            <dt>Урона нанесено</dt>
            <dd>{state.stats.damageDealt}</dd>
          </div>
        </dl>
      </section>
    </>
  )
}
