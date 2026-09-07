import { describe, expect, it } from 'vitest'
import { simulateRun, summarize } from '@/engine/sim/run'
import { POLICIES } from '@/engine/sim/policies'

/**
 * Медленные проверки баланса.
 *
 * Это не юнит-тесты: каждая прогоняет десятки полных партий по четыреста
 * циклов и занимает секунды даже локально. В быстром наборе, который гейтит
 * каждый коммит, им не место — на общем раннере они упирались в таймаут и
 * роняли сборку вместе с деплоем.
 *
 * Запуск: npm run test:balance
 */
/**
 * Ни один стиль игры не должен быть тупиковым. Порог намеренно занижен
 * относительно замеров: тест ловит поломку баланса, а не фиксирует
 * конкретные проценты, которые меняются от правки к правке.
 */
describe('все стили игры жизнеспособны', () => {
  const RUNS = 8
  const MIN_WIN_RATE = 0.12
  // Полные забеги идут до четырёхсот циклов, поэтому стандартных пяти секунд
  // не хватает: проверка баланса заведомо дольше обычного юнит-теста.
  const TIMEOUT = 120_000

  for (const policy of ['aggressive', 'economic', 'cautious'] as const) {
    it(
      `политика «${policy}» доходит до победы`,
      () => {
        const runs = Array.from({ length: RUNS }, (_, i) => simulateRun(policy, 1 + i * 7919))
        const summary = summarize(runs)
        expect(summary.winRate, `${policy}: доля побед ${summary.winRate}`).toBeGreaterThanOrEqual(
          MIN_WIN_RATE,
        )
      },
      TIMEOUT,
    )
  }

  it(
    'ни один путь доктрин не является тупиковым',
    () => {
      // Путь Ткача когда-то отставал втрое: треть его бюджета уходила в
      // подавление, упирающееся в потолок. Проверяем, что перекос не вернулся.
      const byPath = new Map<string, number>()
      for (const path of ['reaver', 'warden', 'weaver'] as const) {
        const policy = POLICIES.cautious as { path: typeof path }
        const original = policy.path
        policy.path = path
        const runs = Array.from({ length: RUNS }, (_, i) => simulateRun('cautious', 1 + i * 7919))
        byPath.set(path, summarize(runs).winRate)
        policy.path = original
      }
      for (const [path, rate] of byPath) {
        expect(rate, `путь ${path}: доля побед ${rate}`).toBeGreaterThan(0)
      }
    },
    TIMEOUT,
  )
})
