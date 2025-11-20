<!-- src/components/StatusBar.vue -->
<template>
  <div class="status-bar">
    <div>🩸 Clots: {{ Math.floor(clots) }}</div>
    <div>⚡ Скорость: {{ totalRate.toFixed(1) }}/сек</div>
    <div>🛡️ Маскировка: 100%</div>
    <div>👁️ Угроза: Низкая</div>
    <div>🧠 Эхо: Инициализация...</div>
  </div>
</template>

<script setup lang="ts">
import { useClots } from '@/composables/useClots'

const { clots, totalRate } = useClots()
</script>

<style scoped>
.status-bar {
  background-color: var(--clot-panel-bg);
  color: var(--clot-panel-text);
  padding: 12px 20px;
  display: flex;
  gap: 20px;
  justify-content: center;
  font-size: 14px;
  border-bottom: 1px solid #e2e8f0;
  user-select: none; /* дублируем на случай каскада */
}
</style>