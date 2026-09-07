/**
 * Замер мутаций.
 *
 * Запуск: npm run balance:mutations [забегов на мутацию]
 *
 * Балансный прогон усредняет по случайным мутациям, поэтому перекос между
 * ними в общей сводке не виден. Здесь каждая мутация ставится принудительно
 * и прогоняется всеми тремя политиками на одних и тех же зёрнах.
 */
import { MUTATIONS } from '../src/engine/content/mutations'
import { simulateRun } from '../src/engine/sim/run'
import type { PolicyId } from '../src/engine/sim/policies'

const runs = Number(process.argv[2] ?? 8)
const POLICIES: PolicyId[] = ['aggressive', 'economic', 'cautious']

console.log(`\nЗамер мутаций: ${runs} забегов на мутацию каждой политикой\n`)
console.log(
  'мутация'.padEnd(24) + 'побед'.padStart(7) + 'циклов'.padStart(9) + 'секторов'.padStart(10),
)
console.log('─'.repeat(50))

const rows: { id: string; name: string; winRate: number; cycles: number; sectors: number }[] = []

for (const mutation of MUTATIONS) {
  let wins = 0
  let total = 0
  const cycles: number[] = []
  const sectors: number[] = []

  for (const policy of POLICIES) {
    for (let i = 0; i < runs; i += 1) {
      const result = simulateRun(policy, 1 + i * 7919, 400, mutation.id)
      total += 1
      if (result.outcome === 'victory') wins += 1
      cycles.push(result.cycles)
      sectors.push(result.sectors)
    }
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)] ?? 0
  }

  rows.push({
    id: mutation.id,
    name: mutation.name,
    winRate: total > 0 ? wins / total : 0,
    cycles: median(cycles),
    sectors: median(sectors),
  })
}

rows.sort((a, b) => b.winRate - a.winRate)
for (const row of rows) {
  console.log(
    row.name.padEnd(24) +
      `${Math.round(row.winRate * 100)}%`.padStart(7) +
      String(row.cycles).padStart(9) +
      String(row.sectors).padStart(10),
  )
}

const best = rows[0]
const worst = rows[rows.length - 1]
if (best && worst) {
  const spread = best.winRate - worst.winRate
  console.log(`\nРазрыв между лучшей и худшей: ${Math.round(spread * 100)} процентных пунктов.`)
  if (spread > 0.35) {
    console.log(`Перекос: «${best.name}» заметно сильнее «${worst.name}».`)
  } else {
    console.log('Перекос в пределах нормы: выбор мутации — вкус, а не оптимум.')
  }
}
console.log('')
