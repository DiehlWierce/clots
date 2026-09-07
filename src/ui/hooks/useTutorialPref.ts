import { useCallback, useState } from 'react'

const KEY = 'clots:tutorial-enabled'

/**
 * Показывать ли обучение в новых забегах.
 *
 * Это предпочтение игрока, а не часть партии: крестик в информере убирает
 * подсказку до конца текущего забега, а эта галка решает, вернётся ли она
 * в следующем. Поэтому она живёт отдельно от сейва.
 */
export function useTutorialPref(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true
    try {
      return localStorage.getItem(KEY) !== 'off'
    } catch {
      return true
    }
  })

  const update = useCallback((value: boolean) => {
    setEnabled(value)
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(KEY, value ? 'on' : 'off')
    } catch {
      // Хранилище может быть запрещено — настройка просто не переживёт перезапуск.
    }
  }, [])

  return [enabled, update]
}
