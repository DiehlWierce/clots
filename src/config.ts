/**
 * Настройки развёртывания.
 *
 * TELEGRAM_BOT_URL — ссылка на мини-приложение, её показывает экран запуска
 * вне Telegram. Переопределяется переменной окружения на сборке.
 */
export const TELEGRAM_BOT_URL: string =
  import.meta.env.VITE_TELEGRAM_BOT_URL ?? 'https://t.me/clots_hembot'

/** Версия сборки: попадает в отчёты об ошибках. */
export const APP_VERSION: string = __APP_VERSION__
