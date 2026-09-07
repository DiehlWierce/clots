import { TELEGRAM_BOT_URL } from '@/config'

/**
 * Экран для запуска вне Telegram.
 *
 * Игра живёт в мини-приложении: там её тема, вибрация, безопасные зоны и
 * управление окном. В обычном браузере вместо частично рабочей версии
 * показываем ссылку — это честнее, чем молча ломаться.
 */
export function TelegramGate({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="gate">
      <div className="gate__icon" aria-hidden="true">
        🩸
      </div>
      <h1>Clots: Hem Empire</h1>
      <p>
        Игра работает как мини-приложение Telegram: оттуда она берёт тему, тактильный отклик и
        безопасные зоны экрана.
      </p>
      <a className="btn btn--primary" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">
        Открыть в Telegram
      </a>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onContinue}>
        Всё равно открыть в браузере
      </button>
      <p className="muted">
        В браузере всё играбельно, но не будет вибрации и телеграмного оформления.
      </p>
    </div>
  )
}
