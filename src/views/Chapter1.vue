<!-- Chapter1.vue -->
<template>
  <div class="chapter1">
    <StatusBar />
    
    <div class="main-content">
      <div class="pool-area">
        <Pool />
      </div>

      <div class="sidebar">
        <Card>
          <template #title>Улучшения</template>
          <template #content>
            <UpgradeItem
              v-for="u in upgrades"
              :key="u.id"
              v-bind="u"
            />
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUpgrades } from '@/composables/useUpgrades'
import StatusBar from '@/components/StatusBar.vue'
import Pool from '@/components/Pool.vue'
import UpgradeItem from '@/components/UpgradeItem.vue'

const { upgrades } = useUpgrades()
</script>

<style scoped>
.chapter1 {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-content {
  display: flex;
  flex: 1;
  padding: 20px;
  gap: 20px;
}

.pool-area {
  flex: 3;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sidebar {
  flex: 1;
  max-width: 320px;
}
</style>