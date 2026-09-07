import { useCallback, useState } from 'react'

/**
 * Состояние интерфейса, переживающее перезапуск.
 *
 * Для настроек вида «как отсортировано дерево развития»: это предпочтение
 * игрока, а не часть партии, поэтому оно живёт отдельно от сейва.
 */
export function usePersistentState<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof localStorage === 'undefined') return fallback
    try {
      const raw = localStorage.getItem(key)
      return allowed.includes(raw as T) ? (raw as T) : fallback
    } catch {
      return fallback
    }
  })

  const update = useCallback(
    (next: T) => {
      setValue(next)
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(key, next)
      } catch {
        // Приватный режим — выбор живёт до перезагрузки.
      }
    },
    [key],
  )

  return [value, update]
}
