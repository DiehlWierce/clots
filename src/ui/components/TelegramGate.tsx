import { TELEGRAM_BOT_URL } from '@/config'

/**
 * Экран для запуска вне Telegram.
 *
 * Игра работает только как мини-приложение: оттуда она берёт тему, тактильный
 * отклик, безопасные зоны и управление окном. Браузерного режима нет — вместо
 * частично рабочей версии показываем ссылку.
 */
export function TelegramGate() {
  return (
    <div className="gate">
      <div className="gate__icon" aria-hidden="true">
        🩸
      </div>
      <h1>Clots: Hem Empire</h1>
      <p>Игра запускается только в Telegram — как мини-приложение.</p>
      <a className="btn btn--primary" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">
        Открыть в Telegram
      </a>
      <p className="muted">{TELEGRAM_BOT_URL.replace('https://', '')}</p>
    </div>
  )
}
