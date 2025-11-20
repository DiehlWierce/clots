// src/composables/useClots.ts
import { ref, computed, watch } from 'vue'

// Храним напрямую в ref — а не в useStorage (пока для MVP)
// Позже можно обернуть в useStorage, но аккуратно
const clots = ref(0)
const autoRate = ref(0)

// Сохраняем при изменении
watch(clots, (val) => {
  localStorage.setItem('clot_clots', val.toString())
}, { flush: 'post' })

watch(autoRate, (val) => {
  localStorage.setItem('clot_autoRate', val.toString())
}, { flush: 'post' })

// Восстанавливаем при старте
if (typeof localStorage !== 'undefined') {
  const savedClots = parseFloat(localStorage.getItem('clot_clots') || '0')
  const savedRate = parseFloat(localStorage.getItem('clot_autoRate') || '0')
  if (!isNaN(savedClots)) clots.value = savedClots
  if (!isNaN(savedRate)) autoRate.value = savedRate
}

export function useClots() {
  const addClots = (amount: number) => {
    clots.value += amount
    // Дебаг в консоль — убери потом
    console.log('✅ +', amount, '→ Clots:', clots.value)
  }

  const totalRate = computed(() => autoRate.value)

  return {
    clots,
    autoRate,
    addClots,
    totalRate
  }
}