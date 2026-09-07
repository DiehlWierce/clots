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

/**
 * Семь шагов. Каждый учит тому, от чего игрок гибнет, а не тому, что и так
 * написано на кнопке.
 *
 * Прежний набор проводил по очевидному — «нажмите Сбор плазмы», «нажмите
 * Синтез сгустков», — и молчал про угрозу, разведку и рейды, то есть про
 * всё, что решает партию. Синтез сгустков выброшен: он всё равно случится,
 * когда игрок пойдёт покупать модуль.
 */
const STEPS: Step[] = [
  {
    title: 'Соберите плазму',
    text: 'Энергия — очки действий на цикл. Потратили — завершайте цикл, она вернётся полностью.',
    done: state => state.stats.plasmaEarned > 0,
  },
  {
    title: 'Займите первый сектор',
    text: 'На «Карте» возьмите «Капиллярный пролив». Сектор приносит доход каждый цикл — и добавляет шум.',
    done: state => state.controlled.length > 1,
  },
  {
    title: 'Завершите цикл',
    text: 'Придёт доход, вернётся энергия — и подрастёт угроза. Каждый сектор поднимает её постоянно.',
    done: state => state.cycle > 1,
  },
  {
    title: 'Следите за угрозой',
    text: 'С 60% начинаются рейды: их не избежать и не отменить. Сбить угрозу можно только разведкой — и не больше 10% за цикл.',
    done: state => state.stats.battlesWon > 0 || state.threat < 25 || state.cycle > 12,
  },
  {
    title: 'Постройте модуль',
    text: 'Модули — цитадель: целостность, защита, энергия. Технологии — экономика. Нужны обе половины.',
    done: state => Object.keys(state.modules).length > 0,
  },
  {
    title: 'Возьмите сектор с гарнизоном',
    text: 'Противник всегда показывает следующее намерение. «Тяжёлый выпад» — ставьте щит, «Экранирование» — бейте вскрытием.',
    done: state => state.stats.battlesWon > 0,
  },
  {
    title: 'Выберите путь',
    text: 'Доктрина закрывает два других пути навсегда. Дальше — Тронный синус и осада: выстоять 15 циклов после победы над Сувереном.',
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
