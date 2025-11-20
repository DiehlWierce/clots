<!-- UpgradeItem.vue -->
<template>
  <div class="upgrade-item">
    <div class="upgrade-header">
      <span>{{ icon }}</span>
      <strong>{{ name }}</strong>
    </div>
    <p class="upgrade-desc">{{ description }}</p>
    <Button
      :label="active ? 'Активно' : `Купить (${cost})`"
      :disabled="active || !canAfford(cost)"
      @click="onBuy"
      :class="{ 'p-button-outlined': active }"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, inject } from 'vue'
import { useUpgrades } from "@/composables/useUpgrades"

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  cost: { type: Number, required: true },
  description: { type: String, required: true },
  active: { type: Boolean, default: false }
})

const { buyUpgrade, canAfford } = useUpgrades()

const onBuy = () => {
  buyUpgrade(props.id)
}
</script>

<style scoped>
.upgrade-item {
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 6px;
  background-color: white;
}

.upgrade-header {
  font-size: 16px;
  margin-bottom: 6px;
}

.upgrade-desc {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}
</style>