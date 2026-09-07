import { TELEGRAM_BOT_URL } from '@/config'
import { dictionary } from '@/i18n'

/**
 * Экран для запуска вне Telegram.
 *
 * Игра работает только как мини-приложение: оттуда она берёт тему, тактильный
 * отклик, безопасные зоны и управление окном. Браузерного режима нет — вместо
 * частично рабочей версии показываем ссылку.
 */
export function TelegramGate() {
  const t = dictionary()

  return (
    <div className="gate">
      <div className="gate__icon" aria-hidden="true">
        🩸
      </div>
      <h1>{t.gate.title}</h1>
      <p>{t.gate.text}</p>
      <a className="btn btn--primary" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">
        {t.gate.open}
      </a>
      <p className="muted">{TELEGRAM_BOT_URL.replace('https://', '')}</p>
    </div>
  )
}
