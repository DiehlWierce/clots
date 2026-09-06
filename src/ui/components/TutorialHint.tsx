import type { GameAction } from '@/engine/actions'

/**
 * Обучение — только подсказка. Оно никогда не блокирует вкладки и действия:
 * именно блокировка вкладок в v1 приводила к неубиваемому софтлоку.
 */
const STEPS = [
  {
    title: 'Соберите плазму',
    text: 'Во вкладке «Командование» нажмите «Сбор плазмы». Каждое действие тратит энергию.',
  },
  {
    title: 'Синтезируйте сгустки',
    text: 'Сгустки — материал модулей. Переработайте в них часть плазмы.',
  },
  {
    title: 'Займите первый сектор',
    text: 'На «Карте» выберите «Капиллярный пролив» и займите его: он даёт доход каждый цикл.',
  },
  {
    title: 'Возьмите сектор с гарнизоном',
    text: 'Секторы с гарнизоном берутся боем. Противник всегда показывает следующее намерение.',
  },
  {
    title: 'Постройте модуль',
    text: 'Во вкладке «Развитие» откройте первый модуль — он усилит цитадель навсегда.',
  },
  {
    title: 'Выберите путь',
    text: 'Доктрина определяет стиль империи и закрывает два других пути. Выбирайте осознанно.',
  },
  {
    title: 'Завершите цикл',
    text: 'Кнопка «Завершить цикл» даёт доход и восстанавливает энергию, но поднимает угрозу.',
  },
] as const

interface Props {
  step: number
  dispatch: (action: GameAction) => void
}

export function TutorialHint({ step, dispatch }: Props) {
  const current = STEPS[Math.min(step, STEPS.length - 1)]
  if (!current || step >= STEPS.length) return null

  return (
    <div className="hint">
      <span aria-hidden="true">💡</span>
      <div className="hint__body">
        <div className="hint__step">
          Шаг {step + 1} из {STEPS.length}
        </div>
        <div className="hint__title">{current.title}</div>
        <div className="hint__text">{current.text}</div>
      </div>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => dispatch({ type: 'tutorial/dismiss' })}
      >
        Скрыть
      </button>
    </div>
  )
}
