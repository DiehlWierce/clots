<template>
  <div class="game-shell">
    <header class="hud">
      <div class="hud__title">
        <span class="hud__brand">Clots: Hem Empire</span>
        <span class="hud__subtitle">День {{ day }}</span>
      </div>
      <div class="hud__stats">
        <div class="stat">
          🩸 Сгустки <strong>{{ Math.floor(clots) }}</strong>
        </div>
        <div class="stat">
          💧 Плазма <strong>{{ Math.floor(plasma) }}</strong>
        </div>
        <div class="stat">
          ✨ Эссенция <strong>{{ Math.floor(essence) }}</strong>
        </div>
        <div class="stat">
          ⚡ Энергия <strong>{{ energy.toFixed(1) }}</strong> / {{ maxEnergy }}
        </div>
        <div class="stat">
          🛡️ Маскировка <strong>{{ Math.floor(masking) }}%</strong>
        </div>
        <div class="stat">
          👁️ Угроза <strong>{{ Math.floor(threat) }}%</strong>
        </div>
        <div class="stat">
          🫀 Целостность <strong>{{ Math.floor(integrity) }}%</strong>
        </div>
      </div>
    </header>

    <main class="game-grid">
      <section class="panel panel--story">
        <h2>Замысел</h2>
        <p>
          Вы — разумная кровь, организующая собственную империю в сосудистой сети.
          Управляйте потоками, избегайте иммунного давления и стройте ядро
          гемо-государства, чтобы пережить бурю.
        </p>
        <div class="actions">
          <button :disabled="isGameOver" @click="gatherPlasma">
            Сбор плазмы (+)
          </button>
          <button :disabled="isGameOver" @click="refineClots">
            Синтез сгустков
          </button>
          <button :disabled="isGameOver" @click="transmuteEssence">
            Возгонка эссенции
          </button>
          <button :disabled="isGameOver" @click="reinforceMasking">
            Усилить маскировку
          </button>
        </div>
        <div class="rates">
          <div>Пассивная плазма: {{ plasmaRate.toFixed(1) }}/сек.</div>
          <div>Атака: {{ attackPower }} • Защита: {{ defensePower }}</div>
        </div>
      </section>

      <section class="panel panel--map">
        <div class="panel__header">
          <h2>Карта кровотока</h2>
          <span>Выберите сектор и разверните операцию.</span>
        </div>
        <div class="map-grid">
          <button
            v-for="node in nodes"
            :key="node.id"
            class="map-node"
            :class="{
              'map-node--active': node.id === selectedNodeId,
              'map-node--cleared': node.cleared,
              'map-node--locked': !node.discovered
            }"
            :disabled="!node.discovered"
            @click="selectedNodeId = node.id"
          >
            <div class="map-node__title">{{ node.name }}</div>
            <div class="map-node__meta">
              {{ nodeLabel(node.type) }} • Уровень {{ node.difficulty }}
            </div>
          </button>
        </div>
      </section>

      <section class="panel panel--details">
        <div v-if="selectedNode" class="details">
          <div class="details__header">
            <h2>{{ selectedNode.name }}</h2>
            <span>{{ nodeLabel(selectedNode.type) }}</span>
          </div>
          <p v-if="selectedNode.cleared" class="tag tag--success">
            Сектор стабилизирован.
          </p>
          <p v-else class="tag tag--warning">
            Требуется вмешательство.
          </p>
          <div class="details__actions">
            <button
              :disabled="isGameOver || selectedNode.cleared"
              @click="exploreNode"
            >
              Исследовать сектор (-2 ⚡)
            </button>
          </div>
          <div class="details__reward">
            <h3>Потенциальная награда</h3>
            <ul>
              <li v-if="selectedNode.reward?.plasma">
                Плазма +{{ selectedNode.reward.plasma }}
              </li>
              <li v-if="selectedNode.reward?.clots">
                Сгустки +{{ selectedNode.reward.clots }}
              </li>
              <li v-if="selectedNode.reward?.essence">
                Эссенция +{{ selectedNode.reward.essence }}
              </li>
              <li v-if="selectedNode.reward?.moduleId">
                Неизвестный модуль
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section class="panel panel--modules">
        <div class="panel__header">
          <h2>Модули цитадели</h2>
          <span>Усиливайте ядро гемо-империи.</span>
        </div>
        <div class="module-grid">
          <div v-for="module in modules" :key="module.id" class="module-card">
            <div class="module-card__header">
              <h3>{{ module.name }}</h3>
              <span v-if="module.unlocked" class="tag tag--success">Активно</span>
            </div>
            <p>{{ module.description }}</p>
            <div class="module-card__cost">
              <span v-if="module.cost.clots">🩸 {{ module.cost.clots }}</span>
              <span v-if="module.cost.plasma">💧 {{ module.cost.plasma }}</span>
              <span v-if="module.cost.essence">✨ {{ module.cost.essence }}</span>
            </div>
            <button
              :disabled="module.unlocked || !canBuy(module.id) || isGameOver"
              @click="buyModule(module.id)"
            >
              {{ module.unlocked ? 'Установлено' : 'Интегрировать' }}
            </button>
          </div>
        </div>
      </section>

      <section class="panel panel--combat">
        <div class="panel__header">
          <h2>Боевой контур</h2>
          <span v-if="encounter">Идёт схватка.</span>
          <span v-else>Контактов нет.</span>
        </div>
        <div v-if="encounter" class="combat">
          <div class="combat__enemy">
            <h3>{{ encounter.enemyName }}</h3>
            <div class="bar">
              <div
                class="bar__fill bar__fill--danger"
                :style="{
                  width: `${(encounter.hp / encounter.maxHp) * 100}%`
                }"
              ></div>
            </div>
            <span>{{ encounter.hp }} / {{ encounter.maxHp }}</span>
          </div>
          <div class="combat__player">
            <h3>Цитадель крови</h3>
            <div class="bar">
              <div
                class="bar__fill"
                :style="{ width: `${integrity}%` }"
              ></div>
            </div>
            <span>{{ Math.floor(integrity) }}%</span>
          </div>
          <div class="combat__actions">
            <button :disabled="isGameOver" @click="attackEnemy">
              Пульс-удар (-1 ⚡)
            </button>
            <button :disabled="isGameOver" @click="burst">
              Гемо-всплеск (-2 ⚡, -6 🩸)
            </button>
            <button :disabled="isGameOver" @click="retreat">
              Отступить
            </button>
          </div>
        </div>
        <div v-else class="combat combat--idle">
          <p>
            Иммунные всплески пока далеко. Исследуйте новые сектора, чтобы
            встретить угрозы и добыть редкие ресурсы.
          </p>
        </div>
      </section>

      <section class="panel panel--log">
        <div class="panel__header">
          <h2>Полевой журнал</h2>
          <span>Последние сигналы ядра.</span>
        </div>
        <ul class="log">
          <li v-for="entry in log" :key="entry.id">
            <span class="log__time">{{ entry.time }}</span>
            <span class="log__message">{{ entry.message }}</span>
          </li>
        </ul>
      </section>
    </main>

    <footer class="footer">
      <div v-if="isGameOver" class="game-over">
        Цитадель разрушена. Обновите страницу, чтобы начать новый цикл.
      </div>
      <div v-else>
        Постройте империю крови, преодолев иммунные волны и стабилизируя сеть.
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/composables/useGameState'

const {
  day,
  clots,
  plasma,
  essence,
  energy,
  threat,
  masking,
  integrity,
  nodes,
  modules,
  log,
  encounter,
  selectedNodeId,
  selectedNode,
  isGameOver,
  maxEnergy,
  plasmaRate,
  attackPower,
  defensePower,
  buyModule,
  gatherPlasma,
  refineClots,
  transmuteEssence,
  reinforceMasking,
  exploreNode,
  attackEnemy,
  burst,
  retreat,
  tick
} = useGameState()

const nodeLabel = (type: string) => {
  switch (type) {
    case 'harvest':
      return 'Сбор'
    case 'battle':
      return 'Угроза'
    case 'ruins':
      return 'Руины'
    case 'forge':
      return 'Кузница'
    case 'boss':
      return 'Босс'
    default:
      return 'Неизвестно'
  }
}

const canBuy = (moduleId: string) => {
  const module = modules.value.find(item => item.id === moduleId)
  if (!module) return false
  const hasClots =
    module.cost.clots === undefined || clots.value >= module.cost.clots
  const hasPlasma =
    module.cost.plasma === undefined || plasma.value >= module.cost.plasma
  const hasEssence =
    module.cost.essence === undefined || essence.value >= module.cost.essence
  return hasClots && hasPlasma && hasEssence
}

let timer: number | null = null

onMounted(() => {
  timer = window.setInterval(() => tick(), 1000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>
