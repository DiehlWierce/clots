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
 * Одиннадцать шагов: проводят игрока по всем действиям цикла и по покупкам —
 * и заодно ведут по сбалансированному пути, который в замерах выигрывает
 * чаще прочих.
 *
 * Порядок не произвольный. Сначала экономика, потом первый сектор ради
 * дохода, потом угроза — она и решает партию, — и только затем развитие и
 * бой. Игрок волен не слушаться: подсказка ничего не блокирует и в любой
 * момент закрывается крестиком.
 */
const STEPS: Step[] = [
  {
    title: 'Соберите плазму',
    text: 'Энергия — очки действий на цикл. Потратили — завершайте цикл, она вернётся полностью.',
    done: state => state.stats.plasmaEarned > 0,
  },
  {
    title: 'Синтезируйте сгустки',
    text: 'Сгустки — материал модулей и топливо всплеска в бою. Переработайте в них плазму.',
    done: state => state.stats.clotsEarned > 0,
  },
  {
    title: 'Займите первый сектор',
    text: 'На «Карте» возьмите «Капиллярный пролив». Сектор даёт доход каждый цикл — и добавляет шум.',
    done: state => state.controlled.length > 1,
  },
  {
    title: 'Завершите цикл',
    text: 'Придёт доход, вернётся энергия — и подрастёт угроза. Каждый сектор поднимает её постоянно.',
    done: state => state.cycle > 1,
  },
  {
    title: 'Постройте модуль',
    text: 'Модули — это цитадель: целостность, защита, энергия. Начните с ветки плазменного потока.',
    done: state => Object.keys(state.modules).length > 0,
  },
  {
    title: 'Усильте маскировку',
    text: 'Маскировка замедляет прирост угрозы. Она сама не держится: чем шире империя, тем быстрее слабеет.',
    done: state => state.stats.masksUsed > 0,
  },
  {
    title: 'Разведайте поток',
    text: 'Разведка — единственный способ снизить саму угрозу, до 10% за цикл. С 60% начинаются рейды.',
    done: state => state.stats.scansUsed > 0,
  },
  {
    title: 'Возгоните эссенцию',
    text: 'Эссенция нужна для технологий и доктрин. Она дороже всего, поэтому копить её начинают рано.',
    done: state => state.stats.essenceEarned > 0,
  },
  {
    title: 'Купите технологию',
    text: 'Технологии — экономика: добыча и доставка. Без них модули будет не на что строить.',
    done: state => Object.keys(state.techs).length > 0,
  },
  {
    title: 'Возьмите сектор с гарнизоном',
    text: 'Противник показывает следующее намерение. «Тяжёлый выпад» — щит, «Экранирование» — вскрытие. Бой не тратит энергию цикла.',
    done: state => state.stats.battlesWon > 0,
  },
  {
    title: 'Восстановите ядро',
    text: 'Лечение возвращает не больше 15% целостности за цикл, поэтому копить урон опасно.',
    done: state => state.stats.mendsUsed > 0,
  },
  {
    title: 'Выберите путь',
    text: 'Доктрина закрывает два других пути навсегда. Дальше — Тронный синус и осада: выстоять 15 циклов.',
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
        className="btn btn--ghost btn--sm hint__close"
        aria-label="Закрыть обучение"
        title="Закрыть обучение"
        onClick={() => {
          dispatch({ type: 'tutorial/dismiss' })
          haptics.tap()
        }}
      >
        ✕
      </button>
    </div>
  )
}
