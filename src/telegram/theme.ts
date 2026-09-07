import { getWebApp, isTelegram, supports } from './sdk'

/**
 * Тема оформления.
 *
 * 'auto' означает «как в Telegram», а вне Telegram — как в системе.
 * Выбор игрока хранится отдельно от сейва: это настройка интерфейса,
 * а не часть партии.
 */

export type ThemeMode = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'clots:theme'
const MODES: ThemeMode[] = ['auto', 'light', 'dark']

export function readThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'auto'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return MODES.includes(raw as ThemeMode) ? (raw as ThemeMode) : 'auto'
  } catch {
    return 'auto'
  }
}

export function writeThemeMode(mode: ThemeMode): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}

/** Что показывать при режиме 'auto': сначала Telegram, потом система. */
export function detectTheme(): ResolvedTheme {
  // colorScheme читаем только внутри Telegram: в обычном браузере скрипт SDK
  // всё равно определяет объект и по умолчанию рапортует 'light',
  // перебивая настоящую системную тему.
  const scheme = isTelegram() ? getWebApp()?.colorScheme : undefined
  if (scheme === 'light' || scheme === 'dark') return scheme
  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'auto' ? detectTheme() : mode
}

/** Цвета шапки и фона Telegram под текущую тему игры. */
const CHROME: Record<ResolvedTheme, { header: string; background: string }> = {
  dark: { header: '#150a0e', background: '#0d0709' },
  light: { header: '#fdf6f7', background: '#fbf3f4' },
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  const colors = CHROME[theme]
  meta?.setAttribute('content', colors.header)

  const app = getWebApp()
  if (!app) return
  try {
    if (supports('6.1')) app.setHeaderColor?.(colors.header)
    if (supports('6.1')) app.setBackgroundColor?.(colors.background)
    if (supports('7.10')) app.setBottomBarColor?.(colors.background)
  } catch {
    // Старый клиент — оформление останется телеграмным, игра не пострадает.
  }
}
