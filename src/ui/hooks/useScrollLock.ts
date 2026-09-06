import { useEffect } from 'react'

/** Блокирует прокрутку фона, пока открыт модальный оверлей. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
