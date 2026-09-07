import { useEffect, useRef, useState } from 'react'

/**
 * Плавно доводит показываемое число до целевого.
 *
 * Ресурсы менялись скачком, и отдача от действия была не видна: цифра просто
 * становилась другой. Короткая анимация превращает её в событие.
 *
 * При включённом «уменьшении движения» анимация отключается — это системная
 * настройка доступности, а не косметика.
 */
export interface AnimatedNumber {
  /** Текущее показываемое значение. */
  value: number
  /** Куда изменилось: подсветка держится дольше самой анимации счёта. */
  direction: 'up' | 'down' | null
  /** На сколько изменилось — показывается всплывающей подписью. */
  delta: number
}

export function useAnimatedNumber(target: number, duration = 700): AnimatedNumber {
  const [value, setValue] = useState(target)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const [delta, setDelta] = useState(0)
  const frame = useRef(0)
  const from = useRef(target)
  const start = useRef(0)

  useEffect(() => {
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (from.current === target) return
    const initial = from.current

    // Подсветка нужна и при отключённой анимации: это не украшение, а
    // единственный сигнал о том, что число изменилось.
    setDirection(target > initial ? 'up' : 'down')
    setDelta(target - initial)
    const clear = setTimeout(() => setDirection(null), 900)

    if (reduced) {
      setValue(target)
      from.current = target
      return () => clearTimeout(clear)
    }

    start.current = performance.now()

    const step = (now: number) => {
      const progress = Math.min(1, (now - start.current) / duration)
      // Замедление к концу: движение читается как «досчитывание».
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(initial + (target - initial) * eased))
      if (progress < 1) frame.current = requestAnimationFrame(step)
      else from.current = target
    }

    frame.current = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame.current)
      clearTimeout(clear)
    }
  }, [target, duration])

  return { value, direction, delta }
}
