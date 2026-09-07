/**
 * Настройки развёртывания.
 *
 * TELEGRAM_BOT_URL — ссылка на мини-приложение, её показывает экран запуска
 * вне Telegram. Значение берётся из переменной окружения VITE_TELEGRAM_BOT_URL
 * на сборке; если она не задана, остаётся ссылка-заглушка.
 */
export const TELEGRAM_BOT_URL: string =
  import.meta.env.VITE_TELEGRAM_BOT_URL ?? 'https://t.me/clots_hem_empire_bot'
