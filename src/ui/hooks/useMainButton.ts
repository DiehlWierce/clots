import { useEffect } from 'react'
import { getWebApp, supports } from '@/telegram'

interface Options {
  visible: boolean
  text: string
  enabled: boolean
  onClick: () => void
  /** Цвет кнопки: без него Telegram красит её своей темой, а не темой игры. */
  color?: string
  textColor?: string
}

/**
 * Системная главная кнопка Telegram.
 *
 * Она рисуется клиентом поверх приложения, всегда на месте и освобождает
 * вертикальное пространство на экране телефона. Вне Telegram и на старых
 * клиентах хук ничего не делает — там остаётся обычная кнопка в интерфейсе.
 */
export function useMainButton({
  visible,
  text,
  enabled,
  onClick,
  color,
  textColor,
}: Options): boolean {
  const available = supports('6.1') && typeof getWebApp()?.MainButton?.setParams === 'function'

  useEffect(() => {
    const button = getWebApp()?.MainButton
    if (!available || !button) return

    try {
      button.setParams?.({
        text,
        is_visible: visible,
        is_active: enabled,
        ...(color !== undefined ? { color } : {}),
        ...(textColor !== undefined ? { text_color: textColor } : {}),
      })
      button.onClick?.(onClick)
    } catch {
      return
    }

    return () => {
      try {
        button.offClick?.(onClick)
        button.hide?.()
      } catch {
        // ignore
      }
    }
  }, [available, visible, text, enabled, onClick, color, textColor])

  return available
}
