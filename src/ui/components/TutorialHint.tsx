import { haptics } from '@/telegram'
import type { GameAction } from '@/engine/actions'
import type { GameState } from '@/engine/types'

/**
 * Обучение — только подсказка: оно никогда не блокирует вкладки и действия.
 *
 * Текущий шаг вычисляется из состояния игры, а не из счётчика: игрок волен
 * делать что угодно и в любом порядке, и подсказка не может «залипнуть» на
 * шаге, который уже давно пройден.
 */
interface Step {
  title: string
  text: string
  done: (state: GameState) => boolean
}

const STEPS: Step[] = [
  {
    title: 'Соберите плазму',
    text: 'Во вкладке «Штаб» нажмите «Сбор плазмы». Каждое действие тратит энергию.',
    done: state => state.stats.plasmaEarned > 0,
  },
  {
    title: 'Синтезируйте сгустки',
    text: 'Сгустки — материал модулей и топливо гемо-всплеска. Переработайте в них плазму.',
    done: state => state.stats.clotsEarned > 0,
  },
  {
    title: 'Займите первый сектор',
    text: 'На «Карте» выберите «Капиллярный пролив»: он приносит доход каждый цикл.',
    done: state => state.controlled.length > 1,
  },
  {
    title: 'Завершите цикл',
    text: 'Кнопка снизу даёт доход и полностью восстанавливает энергию, но поднимает угрозу.',
    done: state => state.cycle > 1,
  },
  {
    title: 'Постройте модуль',
    text: 'Во вкладке «Развитие» откройте первый модуль — он усилит цитадель навсегда.',
    done: state => Object.keys(state.modules).length > 0,
  },
  {
    title: 'Возьмите сектор с гарнизоном',
    text: 'Такие секторы берутся боем. Противник всегда показывает следующее намерение.',
    done: state => state.stats.battlesWon > 0,
  },
  {
    title: 'Выберите путь',
    text: 'Доктрина задаёт стиль империи и закрывает два других пути. Выбирайте осознанно.',
    done: state => state.doctrinePath !== null,
  },
]

interface Props {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function TutorialHint({ state, dispatch }: Props) {
  const index = STEPS.findIndex(step => !step.done(state))
  if (index === -1) return null

  const current = STEPS[index]
  if (!current) return null

  return (
    <div className="hint">
      <span aria-hidden="true">💡</span>
      <div className="hint__body">
        <div className="hint__step">
          Шаг {index + 1} из {STEPS.length}
        </div>
        <div className="hint__title">{current.title}</div>
        <div className="hint__text">{current.text}</div>
      </div>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => {
          dispatch({ type: 'tutorial/dismiss' })
          haptics.tap()
        }}
      >
        Скрыть
      </button>
    </div>
  )
}
