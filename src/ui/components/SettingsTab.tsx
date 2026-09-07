import { useState } from 'react'
import { decodeSaveCode, encodeSaveCode } from '@/engine/save'
import { getWebApp, haptics, isHapticsEnabled, isTelegram, setHapticsEnabled } from '@/telegram'
import type { ThemeMode } from '@/telegram'
import type { GameState } from '@/engine/types'

interface Props {
  state: GameState
  themeMode: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
  onLoad: (state: GameState) => void
  onRestart: () => void
}

const REASONS: Record<string, string> = {
  empty: 'Код пустой — вставьте его в поле.',
  corrupt: 'Код повреждён или это не код сохранения.',
  incompatible: 'Код от несовместимой версии игры.',
}

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
]

function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  )
}

export function SettingsTab({ state, themeMode, onThemeChange, onLoad, onRestart }: Props) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled)

  const inTelegram = isTelegram()
  const platform = getWebApp()?.platform

  const generate = () => {
    const generated = encodeSaveCode(state)
    setCode(generated)
    setStatus({ text: `Код готов: ${generated.length} символов.`, ok: true })
    haptics.success()
  }

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setStatus({ text: 'Код скопирован.', ok: true })
      haptics.success()
    } catch {
      setStatus({ text: 'Браузер не дал доступ к буферу — скопируйте вручную.', ok: false })
      haptics.error()
    }
  }

  const load = () => {
    const result = decodeSaveCode(code)
    if (result.ok) {
      onLoad(result.state)
      setStatus({ text: 'Сохранение загружено.', ok: true })
      haptics.success()
    } else {
      setStatus({ text: REASONS[result.reason] ?? 'Не удалось загрузить код.', ok: false })
      haptics.error()
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel__head">
          <h2>Оформление</h2>
        </div>

        <div className="setting">
          <div>
            <div className="setting__label">Тема</div>
            <div className="setting__hint">
              «Авто» — как в {inTelegram ? 'Telegram' : 'системе'}.
            </div>
          </div>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Тема оформления">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              type="button"
              role="radio"
              className="segmented__item"
              aria-checked={themeMode === theme.id}
              onClick={() => {
                onThemeChange(theme.id)
                haptics.select()
              }}
            >
              {theme.label}
            </button>
          ))}
        </div>

        <div className="setting">
          <div>
            <div className="setting__label">Тактильный отклик</div>
            <div className="setting__hint">
              {inTelegram
                ? 'Вибрация на действия, удары и достижения.'
                : 'Доступна только внутри Telegram.'}
            </div>
          </div>
          <Switch
            checked={hapticsOn}
            label="Тактильный отклик"
            onChange={value => {
              setHapticsEnabled(value)
              setHapticsOn(value)
              if (value) haptics.tap()
            }}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Сохранения</h2>
          <p>Прогресс сохраняется сам. Код нужен, чтобы перенести партию.</p>
        </div>
        <div className="field">
          <textarea
            aria-label="Код сохранения"
            value={code}
            spellCheck={false}
            placeholder="Нажмите «Сгенерировать» или вставьте код"
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
                haptics.warning()
              }}
            >
              Да, стереть прогресс
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => {
              setConfirmReset(true)
              haptics.tap()
            }}
          >
            🔄 Начать заново
          </button>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Как играть</h2>
        </div>
        <details className="chapter" open>
          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Цикл — это ход</summary>
          <p>
            Энергия — очки действий на цикл. Потратили — завершайте цикл: придёт доход с секторов,
            энергия восстановится полностью, а угроза подрастёт.
          </p>
        </details>
        <details className="chapter">
          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>
            Территория стоит внимания
          </summary>
          <p>
            Каждый захваченный сектор даёт доход, но добавляет «шум» — постоянный прирост угрозы. С
            60% начинаются рейды: чем выше угроза, тем чаще и сильнее.
          </p>
        </details>
        <details className="chapter">
          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Бой читается заранее</summary>
          <p>
            Противник всегда показывает следующее намерение. «Тяжёлый выпад» — ставьте щит,
            «Экранирование» — бейте вскрытием. У каждого врага есть уязвимость к конкретному
            действию: урон ×1.5.
          </p>
        </details>
        <details className="chapter">
          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Путь выбирается один раз</summary>
          <p>
            Первая принятая доктрина закрывает два других пути до конца партии. Разоритель — урон,
            Хранитель — выживание, Ткач — экономика и скрытность.
          </p>
        </details>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>О партии</h2>
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
            <dt>Рейдов отбито</dt>
            <dd>{state.stats.raidsSurvived}</dd>
          </div>
          <div>
            <dt>Лучшая серия</dt>
            <dd>{state.stats.bestStreak}</dd>
          </div>
          <div>
            <dt>Среда</dt>
            <dd>{inTelegram ? (platform ?? 'telegram') : 'браузер'}</dd>
          </div>
        </dl>
      </section>
    </>
  )
}
