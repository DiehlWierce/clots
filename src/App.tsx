import { useCallback, useState } from 'react'
import { useGame } from '@/store/useGame'
import { useDerived } from '@/ui/hooks/useDerived'
import { useScrollLock } from '@/ui/hooks/useScrollLock'
import { Hud } from '@/ui/components/Hud'
import { CommandTab } from '@/ui/components/CommandTab'
import { MapTab } from '@/ui/components/MapTab'
import { DevelopmentTab } from '@/ui/components/DevelopmentTab'
import { AchievementsTab, JournalTab, LoreTab } from '@/ui/components/InfoTabs'
import { SystemTab } from '@/ui/components/SystemTab'
import { CombatOverlay } from '@/ui/components/CombatOverlay'
import { VaultOverlay } from '@/ui/components/VaultOverlay'
import { EndOverlay } from '@/ui/components/EndOverlay'
import { TutorialHint } from '@/ui/components/TutorialHint'
import { Toasts } from '@/ui/components/Toasts'
import { ACHIEVEMENTS, SECTORS } from '@/engine/content'

type TabId = 'command' | 'map' | 'development' | 'journal' | 'lore' | 'achievements' | 'system'

const TABS: { id: TabId; label: string }[] = [
  { id: 'command', label: 'Командование' },
  { id: 'map', label: 'Карта' },
  { id: 'development', label: 'Развитие' },
  { id: 'journal', label: 'Журнал' },
  { id: 'lore', label: 'Летопись' },
  { id: 'achievements', label: 'Достижения' },
  { id: 'system', label: 'Система' },
]

export default function App() {
  const state = useGame(s => s.state)
  const toasts = useGame(s => s.toasts)
  const dispatch = useGame(s => s.dispatch)
  const restart = useGame(s => s.restart)
  const loadState = useGame(s => s.loadState)
  const dismissToast = useGame(s => s.dismissToast)

  const [tab, setTab] = useState<TabId>('command')
  const stats = useDerived(state)

  const badges: Partial<Record<TabId, number>> = {
    map: SECTORS.filter(s => state.controlled.includes(s.id)).length,
    development:
      Object.keys(state.modules).length +
      Object.keys(state.doctrines).length +
      Object.keys(state.techs).length,
    achievements: ACHIEVEMENTS.filter(a => {
      const value = state.achievements[a.id] ?? 0
      return a.target ? value >= a.target : value > 0
    }).length,
  }

  const handleDismiss = useCallback((id: number) => dismissToast(id), [dismissToast])
  const busy = state.phase === 'combat' || state.phase === 'vault'
  useScrollLock(state.phase !== 'command')

  return (
    <div className="shell">
      <Hud state={state} stats={stats} />

      {/* Ни одна вкладка не блокируется — интерфейс всегда доступен целиком. */}
      <nav className="tabs" role="tablist" aria-label="Разделы игры">
        {TABS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {badges[item.id] !== undefined ? (
              <span className="tab__badge">{badges[item.id]}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {!state.tutorialDismissed ? (
        <TutorialHint step={state.tutorialStep} dispatch={dispatch} />
      ) : null}

      <main style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', flex: 1 }}>
        {tab === 'command' && <CommandTab state={state} stats={stats} dispatch={dispatch} />}
        {tab === 'map' && <MapTab state={state} dispatch={dispatch} />}
        {tab === 'development' && <DevelopmentTab state={state} dispatch={dispatch} />}
        {tab === 'journal' && <JournalTab state={state} />}
        {tab === 'lore' && <LoreTab state={state} />}
        {tab === 'achievements' && <AchievementsTab state={state} />}
        {tab === 'system' && <SystemTab state={state} onLoad={loadState} onRestart={restart} />}
      </main>

      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={busy}
        onClick={() => dispatch({ type: 'cycle/end' })}
      >
        ⏭️ Завершить цикл {state.cycle} → доход, восстановление энергии, рост угрозы
      </button>

      <footer className="footer">Clots: Hem Empire — пошаговая стратегия о разумной крови.</footer>

      {state.phase === 'combat' && state.combat ? (
        <CombatOverlay state={state} combat={state.combat} stats={stats} dispatch={dispatch} />
      ) : null}
      {state.phase === 'vault' && state.pendingVault ? (
        <VaultOverlay sectorId={state.pendingVault} dispatch={dispatch} />
      ) : null}
      {state.phase === 'collapsed' || state.phase === 'victory' ? (
        <EndOverlay state={state} onRestart={restart} />
      ) : null}

      <Toasts toasts={toasts} onDismiss={handleDismiss} />
    </div>
  )
}
