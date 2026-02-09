<template>
  <div class="game-shell">
    <header class="hud">
      <div class="hud__title">
        <span class="hud__brand">Clots: Hem Empire</span>
        <span class="hud__subtitle">День {{ day }}</span>
      </div>
      <div class="hud__stats">
        <div class="stat">🧬 Уровень <strong>{{ levelInfo.level }}</strong></div>
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
          🫀 Целостность
          <strong>{{ Math.floor(integrity) }}</strong> / {{ maxIntegrity }}
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
        <div class="level-progress">
          <div class="level-progress__title">
            Прогресс уровня: {{ Math.floor(levelInfo.progress * 100) }}%
          </div>
          <div class="bar">
            <div
              class="bar__fill"
              :style="{ width: `${levelInfo.progress * 100}%` }"
            ></div>
          </div>
          <div class="level-progress__meta">
            Опыт {{ experience }} / {{ levelInfo.nextThreshold }}
          </div>
        </div>
        <div class="action-group">
          <h3>Производство</h3>
          <div class="actions">
            <button :disabled="isGameOver" @click="gatherPlasma">
              🌊 Сбор плазмы
              <span class="action-cost">Стоимость: ⚡1</span>
            </button>
            <button :disabled="isGameOver" @click="refineClots">
              🧪 Синтез сгустков
              <span class="action-cost">Стоимость: ⚡1 • 💧18</span>
            </button>
            <button :disabled="isGameOver" @click="transmuteEssence">
              🔮 Возгонка эссенции
              <span class="action-cost">Стоимость: ⚡2 • 🩸12</span>
            </button>
            <button :disabled="isGameOver" @click="reinforceMasking">
              🕶️ Усилить маскировку
              <span class="action-cost">Стоимость: ⚡1 • ✨2</span>
            </button>
          </div>
        </div>
        <div class="action-group">
          <h3>Тактика и движение</h3>
          <div class="actions">
            <button :disabled="isGameOver" @click="scanFlow">
              🛰️ Разведка потока
              <span class="action-cost">Стоимость: ⚡1</span>
            </button>
            <button :disabled="isGameOver" @click="stabilizeCore">
              🧩 Стабилизировать ядро
              <span class="action-cost">Стоимость: ⚡2 • 💧20 • ✨1</span>
            </button>
            <button :disabled="isGameOver" @click="advanceFront">
              🧭 Прорыв фронтира
              <span class="action-cost">Стоимость: ⚡2 • ✨4</span>
            </button>
          </div>
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
              🧭 Исследовать сектор (⚡2)
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
              <li v-if="selectedNode.reward?.experience">
                Опыт +{{ selectedNode.reward.experience }}
              </li>
              <li v-if="selectedNode.reward?.moduleId">Неизвестный модуль</li>
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
            <div class="combat__intent">
              Следующий ход: {{ encounter.intent.label }}
            </div>
          </div>
          <div class="combat__player">
            <h3>Цитадель крови</h3>
            <div class="bar">
            <div
              class="bar__fill"
              :style="{ width: `${(integrity / maxIntegrity) * 100}%` }"
            ></div>
            </div>
            <span>{{ Math.floor(integrity) }} / {{ maxIntegrity }}</span>
            <div class="combat__buffs">
              <span v-if="combatState.focused">🎯 Фокус готов</span>
              <span v-if="combatState.guarded">🛡️ Щит активен</span>
            </div>
          </div>
          <div class="combat__actions">
            <button :disabled="isGameOver" @click="attackEnemy">
              ⚔️ Пульс-удар (⚡1)
            </button>
            <button :disabled="isGameOver" @click="burst">
              💥 Гемо-всплеск (⚡2 • 🩸6)
            </button>
            <button :disabled="isGameOver" @click="focus">
              🎯 Фокусировка (⚡1)
            </button>
            <button :disabled="isGameOver" @click="guard">
              🛡️ Барьер (⚡1)
            </button>
            <button :disabled="isGameOver" @click="retreat">
              🏃 Отступить
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

      <section class="panel panel--doctrine">
        <div class="panel__header">
          <h2>Доктрина развития</h2>
          <span>Выберите путь усиления цитадели.</span>
        </div>
        <div class="doctrine-grid">
          <div
            v-for="doctrine in doctrines"
            :key="doctrine.id"
            class="doctrine-card"
          >
            <div class="doctrine-card__header">
              <h3>{{ doctrine.name }}</h3>
              <span
                v-if="selectedDoctrineId === doctrine.id"
                class="tag tag--success"
              >
                Выбрано
              </span>
            </div>
            <p>{{ doctrine.description }}</p>
            <div class="module-card__cost">
              <span v-if="doctrine.cost.clots">🩸 {{ doctrine.cost.clots }}</span>
              <span v-if="doctrine.cost.plasma">💧 {{ doctrine.cost.plasma }}</span>
              <span v-if="doctrine.cost.essence">✨ {{ doctrine.cost.essence }}</span>
            </div>
            <button
              :disabled="isGameOver || selectedDoctrineId === doctrine.id || !canAfford(doctrine.cost)"
              @click="adoptDoctrine(doctrine.id)"
            >
              {{ selectedDoctrineId === doctrine.id ? 'Активна' : 'Принять' }}
            </button>
          </div>
        </div>
      </section>

      <section class="panel panel--save">
        <div class="panel__header">
          <h2>Сохранения</h2>
          <span>Скопируйте код, чтобы восстановить игру позже.</span>
        </div>

        <div class="save-box">
          <textarea
            v-model="saveCode"
            rows="4"
            placeholder='Вставьте код сохранения или нажмите "Сгенерировать"'
          ></textarea>

          <div class="save-actions">
            <button :disabled="isGameOver" @click="handleGenerateSave">
              💾 Сгенерировать код
            </button>
            <button :disabled="!saveCode" @click="handleCopySave">
              📋 Скопировать
            </button>
            <button :disabled="!saveCode" @click="handleLoadSave">
              📥 Загрузить код
            </button>
          </div>

          <div v-if="saveStatus" class="save-status">
            {{ saveStatus }}
          </div>
        </div>
      </section>

      <section class="panel panel--faq">
        <div class="panel__header">
          <h2>FAQ</h2>
          <span>Как играть и что делать в первую очередь.</span>
        </div>
        <div class="faq">
          <div class="faq__item">
            <h3>С чего начать?</h3>
            <p>
              Используйте «Сбор плазмы», затем «Синтез сгустков», чтобы открыть
              первые модули и усилить атаку или маскировку.
            </p>
          </div>
          <div class="faq__item">
            <h3>Зачем нужна эссенция?</h3>
            <p>
              Эссенция открывает мощные действия: маскировку, прорыв фронтира и
              доктрины развития.
            </p>
          </div>
          <div class="faq__item">
            <h3>Как снижается угроза?</h3>
            <p>
              Разведка потока, маскировка и защитные модули замедляют рост угрозы
              и дают больше времени для укрепления.
            </p>
          </div>
          <div class="faq__item">
            <h3>Что делать в бою?</h3>
            <p>
              Следите за «Следующим ходом» противника. «Фокусировка» усиливает
              удар, «Барьер» снижает урон, а «Гемо-всплеск» подходит для
              добивания.
            </p>
          </div>
          <div class="faq__item">
            <h3>Как сохранить прогресс?</h3>
            <p>
              Сгенерируйте код сохранения, скопируйте его и вставьте при новом
              запуске игры в блоке «Сохранения».
            </p>
          </div>
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
        Цитадель разрушена. Запустите сброс прогресса, чтобы начать новый цикл.
      </div>
      <div v-else>
        Постройте империю крови, преодолев иммунные волны и стабилизируя сеть.
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
  experience,
  nodes,
  modules,
  doctrines,
  selectedDoctrineId,
  log,
  encounter,
  combatState,
  selectedNodeId,
  selectedNode,
  isGameOver,
  maxEnergy,
  maxIntegrity,
  plasmaRate,
  attackPower,
  defensePower,
  levelInfo,
  buyModule,
  adoptDoctrine,
  gatherPlasma,
  refineClots,
  transmuteEssence,
  reinforceMasking,
  scanFlow,
  stabilizeCore,
  advanceFront,
  exploreNode,
  attackEnemy,
  burst,
  focus,
  guard,
  retreat,
  generateSaveCode,
  loadFromCode,
  tick
} = useGameState()

const saveCode = ref('')
const saveStatus = ref('')

const handleGenerateSave = () => {
  saveCode.value = generateSaveCode()
  saveStatus.value = 'Код сохранения обновлён.'
}

const handleLoadSave = () => {
  if (!saveCode.value) return
  const ok = loadFromCode(saveCode.value)
  saveStatus.value = ok ? 'Сохранение загружено.' : 'Не удалось загрузить код.'
}

const handleCopySave = async () => {
  if (!saveCode.value || !navigator?.clipboard) return
  try {
    await navigator.clipboard.writeText(saveCode.value)
    saveStatus.value = 'Код сохранения скопирован.'
  } catch {
    saveStatus.value = 'Не удалось скопировать код.'
  }
}

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
    case 'sanctuary':
      return 'Санктум'
    case 'relay':
      return 'Релейный узел'
    default:
      return 'Неизвестно'
  }
}

const canAfford = (cost: { clots?: number; plasma?: number; essence?: number }) => {
  const hasClots = cost.clots === undefined || clots.value >= cost.clots
  const hasPlasma = cost.plasma === undefined || plasma.value >= cost.plasma
  const hasEssence = cost.essence === undefined || essence.value >= cost.essence
  return hasClots && hasPlasma && hasEssence
}

const canBuy = (moduleId: string) => {
  const module = modules.value.find(item => item.id === moduleId)
  if (!module) return false
  return canAfford(module.cost)
}

let timer: number | null = null

onMounted(() => {
  timer = window.setInterval(() => tick(), 1000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>
