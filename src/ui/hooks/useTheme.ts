import { useCallback, useEffect, useState } from 'react'
import { applyTheme, onEvent, readThemeMode, resolveTheme, writeThemeMode } from '@/telegram'
import type { ThemeMode } from '@/telegram'

/**
 * Тема интерфейса: 'auto' следует за Telegram (а вне Telegram — за системой),
 * либо игрок фиксирует светлую или тёмную вручную.
 */
export function useTheme(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void } {
  const [mode, setModeState] = useState<ThemeMode>(readThemeMode)

  useEffect(() => {
    applyTheme(resolveTheme(mode))
    if (mode !== 'auto') return

    // В режиме «авто» переключаемся вслед за Telegram и системой.
    const reapply = () => applyTheme(resolveTheme('auto'))
    const offTelegram = onEvent('themeChanged', reapply)

    const media =
      typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
    media?.addEventListener('change', reapply)

    return () => {
      offTelegram()
      media?.removeEventListener('change', reapply)
    }
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    writeThemeMode(next)
    setModeState(next)
  }, [])

  return { mode, setMode }
}
