import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Код текущей партии: показывается, чтобы прогресс можно было вынести. */
  getSaveCode: () => Promise<string>
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  error: Error | null
  code: string
}

/**
 * Граница ошибок.
 *
 * Исключение в любом компоненте роняло приложение в белый экран, и для
 * мини-приложения это выглядит как «игра сломалась вместе с прогрессом».
 * Здесь показывается сообщение, кнопка перезагрузки и — главное — код
 * текущей партии: даже если интерфейс не восстановится, прогресс не потерян.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, code: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
    // Код добывается уже после падения: на этот момент состояние игры цело,
    // сломан только интерфейс.
    void this.props
      .getSaveCode()
      .then(code => this.setState({ code }))
      .catch(() => this.setState({ code: '' }))
  }

  override render(): ReactNode {
    const { error, code } = this.state
    if (!error) return this.props.children

    return (
      <div className="gate">
        <div className="gate__icon" aria-hidden="true">
          🩹
        </div>
        <h1>Что-то сломалось</h1>
        <p>
          Интерфейс упал, но партия цела. Скопируйте код ниже — его можно вставить в настройках
          после перезапуска.
        </p>

        {code ? (
          <textarea
            className="crash-code"
            readOnly
            value={code}
            aria-label="Код партии"
            onFocus={event => event.currentTarget.select()}
          />
        ) : (
          <p className="muted">Код партии готовится…</p>
        )}

        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
        <p className="muted">{error.message}</p>
      </div>
    )
  }
}
