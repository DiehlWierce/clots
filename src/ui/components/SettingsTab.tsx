import { useMemo, useState } from 'react'
import {
  decodeSaveCodeAsync,
  encodeSaveCodeCompressed,
  listSnapshots,
  readSnapshot,
} from '@/engine/save'
import {
  buildErrorReport,
  clearErrors,
  getWebApp,
  haptics,
  listErrors,
  isCloudAvailable,
  isHapticsEnabled,
  isTelegram,
  setHapticsEnabled,
} from '@/telegram'
import { buildShareUrl } from '@/telegram'
import { APP_VERSION } from '@/config'
import { LOCALES, dictionary } from '@/i18n'
import type { Locale } from '@/i18n'
import type { ThemeMode } from '@/telegram'
import type { GameState } from '@/engine/types'

interface Props {
  state: GameState
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  themeMode: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
  onLoad: (state: GameState) => void
  onRestart: () => void
}

const REASONS: Record<string, string> = {
  empty: 'Код пустой — вставьте его в поле.',
  corrupt: 'Код повреждён или это не код сохранения.',
  incompatible: 'Код от несовместимой версии игры.',
  compressed: 'Сжатый код не читается на этом устройстве.',
}

const THEME_IDS: ThemeMode[] = ['auto', 'light', 'dark']

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

export function SettingsTab({
  state,
  locale,
  onLocaleChange,
  themeMode,
  onThemeChange,
  onLoad,
  onRestart,
}: Props) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  // Список читается из хранилища при каждом открытии вкладки: она
  // монтируется по требованию, и пересчитывать чаще незачем.
  const snapshots = useMemo(() => listSnapshots(), [])
  const [errors, setErrors] = useState(() => listErrors())
  // Генерация и разбор кода стали асинхронными: без индикации на медленном
  // устройстве кажется, что кнопка не сработала.
  const [busy, setBusy] = useState<'generate' | 'load' | null>(null)
  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled)

  const t = dictionary(locale)
  const inTelegram = isTelegram()
  const platform = getWebApp()?.platform

  const generate = () => {
    setBusy('generate')
    // Сжатый код в разы короче; если сжатие недоступно, вернётся обычный.
    void encodeSaveCodeCompressed(state)
      .then(generated => {
        setCode(generated)
        setStatus({ text: `Код готов: ${generated.length} символов.`, ok: true })
        haptics.success()
      })
      .finally(() => setBusy(null))
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
    setBusy('load')
    void decodeSaveCodeAsync(code)
      .then(result => {
        if (result.ok) {
          onLoad(result.state)
          setStatus({ text: 'Сохранение загружено.', ok: true })
          haptics.success()
        } else {
          setStatus({ text: REASONS[result.reason] ?? 'Не удалось загрузить код.', ok: false })
          haptics.error()
        }
      })
      .finally(() => setBusy(null))
  }

  return (
    <>
      <section className="panel">
        <div className="panel__head">
          <h2>{t.settings.appearance}</h2>
        </div>

        <div className="setting">
          <div>
            <div className="setting__label">{t.settings.language}</div>
            <div className="setting__hint">{t.settings.languageHint}</div>
          </div>
        </div>
        <div className="segmented" role="radiogroup" aria-label={t.settings.language}>
          {LOCALES.map(item => (
            <button
              key={item.id}
              type="button"
              role="radio"
              className="segmented__item"
              aria-checked={locale === item.id}
              onClick={() => {
                onLocaleChange(item.id)
                haptics.select()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="setting">
          <div>
            <div className="setting__label">{t.settings.theme}</div>
            <div className="setting__hint">
              «Авто» — как в {inTelegram ? 'Telegram' : 'системе'}.
            </div>
          </div>
        </div>
        <div className="segmented" role="radiogroup" aria-label={t.settings.theme}>
          {THEME_IDS.map(id => (
            <button
              key={id}
              type="button"
              role="radio"
              className="segmented__item"
              aria-checked={themeMode === id}
              onClick={() => {
                onThemeChange(id)
                haptics.select()
              }}
            >
              {id === 'auto'
                ? t.settings.themeAuto
                : id === 'light'
                  ? t.settings.themeLight
                  : t.settings.themeDark}
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
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy !== null}
              onClick={generate}
            >
              {busy === 'generate' ? '⏳ Готовим…' : '💾 Сгенерировать'}
            </button>
            <button type="button" className="btn" disabled={!code} onClick={() => void copy()}>
              📋 Скопировать
            </button>
            <button type="button" className="btn" disabled={!code || busy !== null} onClick={load}>
              {busy === 'load' ? '⏳ Читаем…' : '📥 Загрузить'}
            </button>
          </div>
          {status ? (
            <p className="muted" style={{ color: status.ok ? 'var(--c-good)' : 'var(--c-bad)' }}>
              {status.text}
            </p>
          ) : null}
          {/* Синхронизация идёт сама, поэтому здесь только её состояние:
              кнопка ручной выгрузки предлагала бы делать работу за игру. */}
          <p className="muted">
            {isCloudAvailable() ? t.settings.cloudAuto : t.settings.cloudUnavailable}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>{t.settings.slots}</h2>
          <p>{t.settings.slotsHint}</p>
        </div>
        {snapshots.length === 0 ? (
          <p className="muted">{t.settings.slotsEmpty}</p>
        ) : (
          <div className="grid">
            {snapshots.map(slot => (
              <button
                key={slot.index}
                type="button"
                className="action"
                onClick={() => {
                  const restored = readSnapshot(slot.index)
                  if (!restored) {
                    setStatus({ text: 'Снимок повреждён.', ok: false })
                    haptics.error()
                    return
                  }
                  onLoad(restored)
                  setStatus({ text: `Восстановлен цикл ${slot.cycle}.`, ok: true })
                  haptics.success()
                }}
              >
                <span className="action__title">
                  {t.settings.cycleShort} {slot.cycle}
                </span>
                <span className="action__desc">
                  {slot.sectors} {t.settings.sectorsShort} ·{' '}
                  {new Date(slot.savedAt).toLocaleString()}
                </span>
                <span className="action__cost">{t.settings.slotRestore}</span>
              </button>
            ))}
          </div>
        )}
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
          <h2>{t.settings.diagnostics}</h2>
          <p>{t.settings.diagnosticsHint}</p>
        </div>
        {errors.length === 0 ? (
          <p className="muted">{t.settings.diagnosticsEmpty}</p>
        ) : (
          <>
            <p className="muted">
              {errors.length} {t.settings.errorsCount}: {errors[0]?.message.slice(0, 80)}
            </p>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const report = buildErrorReport(platform ?? 'browser', APP_VERSION)
                  // Отчёт уходит обычной ссылкой «поделиться»: игрок видит,
                  // что именно отправляет, и выбирает получателя сам.
                  window.open(buildShareUrl(report), '_blank', 'noopener')
                  haptics.tap()
                }}
              >
                {t.settings.diagnosticsSend}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  clearErrors()
                  setErrors([])
                  haptics.tap()
                }}
              >
                {t.settings.diagnosticsClear}
              </button>
            </div>
          </>
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
