import { useEffect } from 'react'
import { getWebApp } from '@/telegram'

/**
 * Системная кнопка «Назад» Telegram.
 *
 * Показывается, когда есть куда возвращаться (игрок не на главной вкладке),
 * и скрывается на главной — так мини-приложение ведёт себя как нативный экран.
 */
export function useBackButton(visible: boolean, onBack: () => void): void {
  useEffect(() => {
    const button = getWebApp()?.BackButton
    if (!button) return

    try {
      button.onClick?.(onBack)
      if (visible) button.show?.()
      else button.hide?.()
    } catch {
      return
    }

    return () => {
      try {
        button.offClick?.(onBack)
        button.hide?.()
      } catch {
        // ignore
      }
    }
  }, [visible, onBack])
}
