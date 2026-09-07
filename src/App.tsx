import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useGame } from '@/store/useGame'
import { useDerived } from '@/ui/hooks/useDerived'
import { useScrollLock } from '@/ui/hooks/useScrollLock'
import { useTheme } from '@/ui/hooks/useTheme'
import { useBackButton } from '@/ui/hooks/useBackButton'
import { useMainButton } from '@/ui/hooks/useMainButton'
import { Hud } from '@/ui/components/Hud'
import { CommandTab } from '@/ui/components/CommandTab'
import { MapTab } from '@/ui/components/MapTab'
import { DevelopmentTab } from '@/ui/components/DevelopmentTab'
// «Хроника» и «Настройки» не нужны на первом экране: мини-приложение
// открывают по клику в чате, и первый рендер важнее всего.
const ChronicleTab = lazy(() =>
  import('@/ui/components/ChronicleTab').then(m => ({ default: m.ChronicleTab })),
)
const SettingsTab = lazy(() =>
  import('@/ui/components/SettingsTab').then(m => ({ default: m.SettingsTab })),
)
import { CombatOverlay } from '@/ui/components/CombatOverlay'
import { VaultOverlay } from '@/ui/components/VaultOverlay'
import { MutationOverlay } from '@/ui/components/MutationOverlay'
import { EventOverlay } from '@/ui/components/EventOverlay'
import { EndOverlay } from '@/ui/components/EndOverlay'
import { TutorialHint } from '@/ui/components/TutorialHint'
import { TelegramGate } from '@/ui/components/TelegramGate'
import { Toasts } from '@/ui/components/Toasts'
import { ACHIEVEMENTS } from '@/engine/content'
import { isAchievementEarned } from '@/engine/selectors'
import { haptics, initWebApp, isPlaytest, isTelegram, watchViewport } from '@/telegram'

type TabId = 'command' | 'map' | 'development' | 'chronicle' | 'settings'

/** Пять пунктов — предел для нижней панели на телефоне. */
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'command', icon: '🎛️', label: 'Штаб' },
  { id: 'map', icon: '🗺️', label: 'Карта' },
  { id: 'development', icon: '⚗️', label: 'Развитие' },
  { id: 'chronicle', icon: '📜', label: 'Хроника' },
  { id: 'settings', icon: '⚙️', label: 'Настройки' },
]

const HOME: TabId = 'command'

export default function App() {
  const state = useGame(s => s.state)
  const toasts = useGame(s => s.toasts)
  const dispatch = useGame(s => s.dispatch)
  const restart = useGame(s => s.restart)
  const newGamePlus = useGame(s => s.newGamePlus)
  const loadState = useGame(s => s.loadState)
  const dismissToast = useGame(s => s.dismissToast)
  const syncFromCloud = useGame(s => s.syncFromCloud)
  const pushToCloud = useGame(s => s.pushToCloud)
  const cloudBusy = useGame(s => s.cloudBusy)

  const [tab, setTab] = useState<TabId>(HOME)
  const { mode: themeMode, setMode: setThemeMode } = useTheme()
  const stats = useDerived(state)

  // Инициализация мини-приложения: разворот окна, безопасные зоны, свайпы.
  useEffect(() => {
    initWebApp()
    return watchViewport()
  }, [])

  // При запуске подтягиваем партию из облака, если она новее локальной:
  // мини-приложение открывают и с телефона, и с десктопа.
  useEffect(() => {
    void syncFromCloud()
  }, [syncFromCloud])

  // Выгружаем прогресс в облако по завершении цикла — это естественная точка
  // сохранения и достаточно редкая, чтобы не упереться в лимиты Telegram.
  useEffect(() => {
    if (state.cycle <= 1) return
    void pushToCloud()
  }, [state.cycle, pushToCloud])

  // Системная кнопка «Назад» возвращает на главную вкладку.
  const goHome = useCallback(() => setTab(HOME), [])
  useBackButton(tab !== HOME && state.phase === 'command', goHome)

  useScrollLock(state.phase !== 'command')

  const badges = useMemo<Partial<Record<TabId, number>>>(
    () => ({
      map: state.controlled.length,
      development:
        Object.keys(state.modules).length +
        Object.keys(state.doctrines).length +
        Object.keys(state.techs).length,
      chronicle: ACHIEVEMENTS.filter(a => isAchievementEarned(state, a.id)).length,
    }),
    // Состояние иммутабельно: одна зависимость точнее набора его полей.
    [state],
  )

  const handleDismiss = useCallback((id: number) => dismissToast(id), [dismissToast])

  const selectTab = useCallback((next: TabId) => {
    setTab(next)
    haptics.select()
  }, [])

  const endCycle = useCallback(() => {
    haptics.tap()
    dispatch({ type: 'cycle/end' })
  }, [dispatch])

  // Главную кнопку рисует сам Telegram: она всегда на месте и освобождает
  // место на экране. Вне Telegram остаётся обычная кнопка в интерфейсе.
  const busyPhase = state.phase !== 'command'
  const nativeButton = useMainButton({
    visible: !busyPhase,
    enabled: !busyPhase,
    text: `Завершить цикл ${state.cycle}`,
    onClick: endCycle,
  })

  // Игра работает только внутри Telegram. Исключения — локальная разработка
  // и скрытый режим отладки (?playtest=hem), о котором игрок не знает.
  if (!isTelegram() && !import.meta.env.DEV && !isPlaytest()) {
    return <TelegramGate />
  }

  return (
    <div className="app">
      <Hud state={state} stats={stats} />

      <main className="content">
        {!state.tutorialDismissed ? <TutorialHint state={state} dispatch={dispatch} /> : null}

        {tab === 'command' && <CommandTab state={state} stats={stats} dispatch={dispatch} />}
        {tab === 'map' && <MapTab state={state} dispatch={dispatch} />}
        {tab === 'development' && <DevelopmentTab state={state} dispatch={dispatch} />}
        {tab === 'chronicle' && (
          <Suspense fallback={<p className="muted">Загружаем хронику…</p>}>
            <ChronicleTab state={state} />
          </Suspense>
        )}
        {tab === 'settings' && (
          <Suspense fallback={<p className="muted">Загружаем настройки…</p>}>
            <SettingsTab
              state={state}
              cloudBusy={cloudBusy}
              onCloudPush={pushToCloud}
              onCloudPull={syncFromCloud}
              themeMode={themeMode}
              onThemeChange={setThemeMode}
              onLoad={loadState}
              onRestart={restart}
            />
          </Suspense>
        )}
      </main>

      <div className="cycle-bar">
        {nativeButton ? null : (
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={busyPhase}
            onClick={endCycle}
          >
            ⏭️ Завершить цикл {state.cycle}
          </button>
        )}
        <div className="cycle-bar__hint">
          Доход +{stats.income.plasma}💧 · энергия {stats.maxEnergy}⚡ · угроза +{stats.threatGain}%
        </div>
      </div>

      {/* Ни одна вкладка не блокируется: интерфейс всегда доступен целиком. */}
      <nav className="nav" role="tablist" aria-label="Разделы игры">
        {TABS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="nav__item"
            aria-selected={tab === item.id}
            onClick={() => selectTab(item.id)}
          >
            <span className="nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav__label">{item.label}</span>
            {badges[item.id] ? <span className="nav__badge">{badges[item.id]}</span> : null}
          </button>
        ))}
      </nav>

      {state.phase === 'mutation' ? (
        <MutationOverlay offer={state.mutationOffer} dispatch={dispatch} />
      ) : null}
      {state.phase === 'event' && state.pendingEvent ? (
        <EventOverlay state={state} eventId={state.pendingEvent} dispatch={dispatch} />
      ) : null}
      {state.phase === 'combat' && state.combat ? (
        <CombatOverlay state={state} combat={state.combat} stats={stats} dispatch={dispatch} />
      ) : null}
      {state.phase === 'vault' && state.pendingVault ? (
        <VaultOverlay sectorId={state.pendingVault} dispatch={dispatch} />
      ) : null}
      {state.phase === 'collapsed' || state.phase === 'victory' ? (
        <EndOverlay state={state} onRestart={restart} onNewGamePlus={newGamePlus} />
      ) : null}

      <Toasts toasts={toasts} onDismiss={handleDismiss} />
    </div>
  )
}
