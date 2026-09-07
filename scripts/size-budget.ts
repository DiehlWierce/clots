/**
 * Бюджет размера сборки.
 *
 * Бандл рос от итерации к итерации незаметно: 144 КБ на старте второй версии,
 * 410 КБ к концу. Никто не заметил бы и следующего скачка. Проверка падает,
 * если чанк вышел за отведённый ему предел, — это дешевле любых оптимизаций
 * постфактум.
 *
 * Запуск: npm run size
 */
import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

interface Budget {
  /** Начало имени файла. */
  prefix: string
  label: string
  /** Расширение: главный чанк и стили называются одинаково. */
  ext: '.js' | '.css'
  /** Предел в килобайтах после сжатия. */
  maxGzipKb: number
}

const BUDGETS: Budget[] = [
  { prefix: 'index-', ext: '.js', label: 'главный чанк', maxGzipKb: 60 },
  { prefix: 'vendor-react-', ext: '.js', label: 'React', maxGzipKb: 70 },
  { prefix: 'vendor-state-', ext: '.js', label: 'состояние', maxGzipKb: 10 },
  { prefix: 'en-', ext: '.js', label: 'английский пакет', maxGzipKb: 20 },
  { prefix: 'ChronicleTab-', ext: '.js', label: 'хроника', maxGzipKb: 12 },
  { prefix: 'SettingsTab-', ext: '.js', label: 'настройки', maxGzipKb: 12 },
  { prefix: 'index-', ext: '.css', label: 'стили ядра', maxGzipKb: 8 },
  { prefix: 'ChronicleTab-', ext: '.css', label: 'стили хроники', maxGzipKb: 3 },
  { prefix: 'SettingsTab-', ext: '.css', label: 'стили настроек', maxGzipKb: 3 },
]

const dir = join(process.cwd(), 'dist', 'assets')
let files: string[]
try {
  files = readdirSync(dir)
} catch {
  console.error('Сборки нет. Сначала выполните: npx vite build')
  process.exit(1)
}

const kb = (bytes: number) => bytes / 1024
let failed = false

console.log('\nБюджет размера (после gzip)\n')
console.log('чанк'.padEnd(22) + 'размер'.padStart(10) + 'предел'.padStart(10) + '  статус')
console.log('─'.repeat(52))

for (const budget of BUDGETS) {
  const match = files.find(file => file.startsWith(budget.prefix) && file.endsWith(budget.ext))
  if (!match) {
    console.log(budget.label.padEnd(22) + 'нет файла'.padStart(10))
    continue
  }
  const gzip = kb(gzipSync(readFileSync(join(dir, match))).length)
  const ok = gzip <= budget.maxGzipKb
  if (!ok) failed = true
  console.log(
    budget.label.padEnd(22) +
      `${gzip.toFixed(1)} КБ`.padStart(10) +
      `${budget.maxGzipKb} КБ`.padStart(10) +
      (ok ? '  ✓' : '  ✗ превышен'),
  )
}

// Суммарный вес того, что скачивается при первом открытии на русском.
const initial = (() => {
  const taken = new Set<string>()
  const pick = (prefix: string, ext: string): string | undefined => {
    // Файл засчитывается один раз: префикс 'vendor-' иначе поймал бы
    // vendor-react и удвоил бы его вес в итоговой сумме.
    const match = files.find(f => f.startsWith(prefix) && f.endsWith(ext) && !taken.has(f))
    if (match) taken.add(match)
    return match
  }
  return [
    pick('index-', '.js'),
    pick('vendor-react-', '.js'),
    pick('vendor-state-', '.js'),
    pick('vendor-', '.js'),
    pick('index-', '.css'),
  ].filter((f): f is string => Boolean(f))
})()
const initialGzip = initial.reduce(
  (sum, file) => sum + kb(gzipSync(readFileSync(join(dir, file))).length),
  0,
)
console.log(`\nПервая загрузка (русский): ${initialGzip.toFixed(1)} КБ после сжатия`)

if (failed) {
  console.error('\nБюджет превышен. Либо оптимизируйте, либо осознанно поднимите предел.\n')
  process.exit(1)
}
console.log('')
