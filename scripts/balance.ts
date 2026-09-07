/**
 * Балансный харнесс.
 *
 * Запуск: npm run balance [число забегов на политику]
 *
 * Гоняет партии тремя политиками на одних и тех же зёрнах и печатает отчёт:
 * доля побед, медианный цикл завершения, где чаще всего обрывается забег.
 * Это превращает балансировку из ощущений в измерение.
 */
import { runSuite } from '../src/engine/sim/run'
import { getSector } from '../src/engine/content'
import { MUTATIONS } from '../src/engine/content/mutations'

const runs = Number(process.argv[2] ?? 60)
if (!Number.isFinite(runs) || runs <= 0) {
  console.error('Укажите положительное число забегов.')
  process.exit(1)
}

console.log(`\nБалансный прогон: ${runs} забегов на политику\n`)

const started = Date.now()
const suite = runSuite(runs)
const elapsed = ((Date.now() - started) / 1000).toFixed(1)

const pad = (value: string, width: number) => value.padEnd(width)
const num = (value: string | number, width: number) => String(value).padStart(width)

console.log(
  pad('Политика', 16) +
    num('побед', 7) +
    num('гибель', 8) +
    num('лимит', 7) +
    num('циклов', 8) +
    num('секторов', 10) +
    num('уровень', 9) +
    '  стена',
)
console.log('─'.repeat(84))

for (const summary of suite.values()) {
  const wall = summary.commonWall
    ? (getSector(summary.commonWall)?.name ?? summary.commonWall)
    : '—'
  console.log(
    pad(summary.name, 16) +
      num(`${Math.round(summary.winRate * 100)}%`, 7) +
      num(String(summary.collapses), 8) +
      num(String(summary.timeouts), 7) +
      num(String(summary.medianCycles), 8) +
      num(String(summary.medianSectors), 10) +
      num(String(summary.medianLevel), 9) +
      '  ' +
      wall,
  )
}

console.log(`\nВсего мутаций в пуле: ${MUTATIONS.length}. Прогон занял ${elapsed} с.\n`)

// Подсказки по балансу — то, ради чего харнесс и нужен.
const summaries = [...suite.values()]
const warnings: string[] = []

for (const s of summaries) {
  if (s.winRate === 0) warnings.push(`${s.name}: ни одной победы — путь может быть непроходим.`)
  if (s.winRate > 0.9) warnings.push(`${s.name}: побеждает почти всегда — слишком легко.`)
  if (s.medianSectors < 6) warnings.push(`${s.name}: медиана всего ${s.medianSectors} секторов.`)
}

const spread =
  Math.max(...summaries.map(s => s.winRate)) - Math.min(...summaries.map(s => s.winRate))
if (spread > 0.6) {
  warnings.push(`Разрыв между политиками ${Math.round(spread * 100)}% — один стиль доминирует.`)
}

if (warnings.length > 0) {
  console.log('Замечания:')
  for (const warning of warnings) console.log(`  • ${warning}`)
  console.log('')
}
