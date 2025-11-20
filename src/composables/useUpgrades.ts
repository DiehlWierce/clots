// useUpgrades.ts
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useClots } from './useClots'

export interface Upgrade {
  id: string
  name: string
  icon: string
  cost: number
  rate: number
  description: string
  active: boolean
}

export function useUpgrades() {
  const upgrades = useStorage<Upgrade[]>('clot_upgrades', [
    {
      id: 'hemoseed',
      name: 'Гемо-затравка I',
      icon: '💉',
      cost: 10,
      rate: 0.1,
      description: '+0.1 Clots/сек (ручной сбор)',
      active: false
    },
    {
      id: 'autocollector',
      name: 'Автосборщик I',
      icon: '🤖',
      cost: 50,
      rate: 0.2,
      description: '+0.2 Clots/сек (авто)',
      active: false
    },
    {
      id: 'thermo',
      name: 'Термоконтроль',
      icon: '🌡️',
      cost: 200,
      rate: 0,
      description: '–10% риск коагуляции',
      active: false
    },
    {
      id: 'echo-core',
      name: 'Эхо: Лог-ядро',
      icon: '🧠',
      cost: 500,
      rate: 0,
      description: 'Разблокирует ИИ-лог',
      active: false
    }
  ])

  const canAfford = (cost: number) => {
    const { clots } = useClots()
    return clots.value >= cost
  }

  const buyUpgrade = (id: string) => {
    const { clots, autoRate } = useClots()
    const upgrade = upgrades.value.find(u => u.id === id)
    if (upgrade && canAfford(upgrade.cost)) {
      clots.value -= upgrade.cost
      upgrade.active = true
      if (upgrade.rate > 0) {
        autoRate.value += upgrade.rate
      }
    }
  }

  return {
    upgrades,
    buyUpgrade,
    canAfford
  }
}