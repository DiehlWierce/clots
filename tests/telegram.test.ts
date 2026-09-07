import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTelegram, supports } from '@/telegram/sdk'
import { detectTheme, resolveTheme } from '@/telegram/theme'
import { haptics, isHapticsEnabled, setHapticsEnabled } from '@/telegram/haptics'
import type { TelegramWebApp } from '@/telegram/types'

/** Подставляет фейковый WebApp в глобальный объект. */
function mockTelegram(app: TelegramWebApp | null): void {
  const target = globalThis as { window?: unknown }
  const win = (target.window ?? {}) as { Telegram?: { WebApp?: TelegramWebApp } }
  if (app) win.Telegram = { WebApp: app }
  else delete win.Telegram
  target.window = win
}

beforeEach(() => {
  mockTelegram(null)
  setHapticsEnabled(true)
})

afterEach(() => {
  mockTelegram(null)
  vi.restoreAllMocks()
})

describe('определение Telegram', () => {
  it('вне Telegram возвращает false', () => {
    expect(isTelegram()).toBe(false)
  })

  it('голый SDK без платформы и initData не считается Telegram', () => {
    // Скрипт SDK определяет window.Telegram и в обычном браузере,
    // поэтому одного его наличия недостаточно.
    mockTelegram({ platform: 'unknown', initData: '' })
    expect(isTelegram()).toBe(false)
  })

  it('известная платформа считается Telegram', () => {
    mockTelegram({ platform: 'ios' })
    expect(isTelegram()).toBe(true)
  })

  it('непустой initData считается Telegram', () => {
    mockTelegram({ platform: 'unknown', initData: 'user=%7B%7D&hash=abc' })
    expect(isTelegram()).toBe(true)
  })
})

describe('проверка версии клиента', () => {
  it('без SDK возвращает false, а не падает', () => {
    expect(supports('6.1')).toBe(false)
  })

  it('уважает ответ isVersionAtLeast', () => {
    mockTelegram({ platform: 'ios', isVersionAtLeast: v => v === '6.1' })
    expect(supports('6.1')).toBe(true)
    expect(supports('8.0')).toBe(false)
  })

  it('исключение внутри SDK гасится', () => {
    mockTelegram({
      platform: 'ios',
      isVersionAtLeast: () => {
        throw new Error('старый клиент')
      },
    })
    expect(supports('6.1')).toBe(false)
  })
})

describe('тема', () => {
  it('явный выбор побеждает автоопределение', () => {
    mockTelegram({ platform: 'ios', colorScheme: 'light' })
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('в режиме «авто» берётся тема Telegram', () => {
    mockTelegram({ platform: 'ios', colorScheme: 'light' })
    expect(resolveTheme('auto')).toBe('light')
    mockTelegram({ platform: 'ios', colorScheme: 'dark' })
    expect(resolveTheme('auto')).toBe('dark')
  })

  it('без Telegram и без matchMedia остаётся тёмная', () => {
    expect(detectTheme()).toBe('dark')
  })

  it('colorScheme голого SDK в браузере не перебивает системную тему', () => {
    // Скрипт SDK объявляет window.Telegram и вне Telegram, по умолчанию
    // рапортуя 'light'. Доверять этому значению вне Telegram нельзя.
    mockTelegram({ platform: 'unknown', initData: '', colorScheme: 'light' })
    expect(detectTheme()).toBe('dark')
  })
})

describe('таптик', () => {
  it('вне Telegram вызовы безопасны', () => {
    expect(() => {
      haptics.tap()
      haptics.success()
      haptics.select()
    }).not.toThrow()
  })

  it('вызывает SDK, когда клиент поддерживает', () => {
    const impactOccurred = vi.fn()
    const notificationOccurred = vi.fn()
    mockTelegram({
      platform: 'android',
      isVersionAtLeast: () => true,
      HapticFeedback: { impactOccurred, notificationOccurred },
    })
    haptics.hit()
    haptics.success()
    expect(impactOccurred).toHaveBeenCalledWith('medium')
    expect(notificationOccurred).toHaveBeenCalledWith('success')
  })

  it('выключенный отклик ничего не вызывает', () => {
    const impactOccurred = vi.fn()
    mockTelegram({
      platform: 'android',
      isVersionAtLeast: () => true,
      HapticFeedback: { impactOccurred },
    })
    setHapticsEnabled(false)
    expect(isHapticsEnabled()).toBe(false)
    haptics.hit()
    expect(impactOccurred).not.toHaveBeenCalled()
  })

  it('старый клиент без HapticFeedback не ломает игру', () => {
    mockTelegram({ platform: 'android', isVersionAtLeast: () => false })
    expect(() => haptics.crit()).not.toThrow()
  })
})

describe('режим отладки в браузере', () => {
  interface FakeWindow {
    location: { search: string }
    sessionStorage: {
      getItem: (key: string) => string | null
      setItem: (key: string, value: string) => void
    }
  }

  /** Общее на весь тест хранилище вкладки: режим обязан переживать навигацию. */
  const store = new Map<string, string>()
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  }

  function mockLocation(search: string): void {
    const target = globalThis as { window?: FakeWindow }
    target.window = { location: { search }, sessionStorage: storage }
  }

  beforeEach(() => {
    store.clear()
  })

  it('без параметра выключен', async () => {
    mockLocation('')
    const { isPlaytest } = await import('@/telegram/playtest')
    expect(isPlaytest()).toBe(false)
  })

  it('включается ключом в адресе и запоминается на вкладку', async () => {
    mockLocation('?playtest=hem')
    const { isPlaytest } = await import('@/telegram/playtest')
    expect(isPlaytest()).toBe(true)

    // После перехода внутри приложения параметр из адреса пропадает,
    // но режим обязан сохраниться до конца сессии.
    mockLocation('')
    expect(isPlaytest()).toBe(true)
  })

  it('неверный ключ не включает режим', async () => {
    mockLocation('?playtest=нет')
    const { isPlaytest } = await import('@/telegram/playtest')
    expect(isPlaytest()).toBe(false)
  })
})
