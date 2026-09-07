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
export function useAnimatedNumber(target: number, duration = 320): number {
  const [value, setValue] = useState(target)
  const frame = useRef(0)
  const from = useRef(target)
  const start = useRef(0)

  useEffect(() => {
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || from.current === target) {
      setValue(target)
      from.current = target
      return
    }

    const initial = from.current
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
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])

  return value
}
