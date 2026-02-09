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
      <div class="hud__training">
        <div class="hud__training-info">
          <div class="hud__training-title">
            🎯 Режим обучения
            <span class="tag" :class="tutorialEnabled ? 'tag--success' : 'tag--warning'">
              {{ tutorialEnabled ? 'Включен' : 'Выключен' }}
            </span>
          </div>
          <div v-if="tutorialEnabled" class="hud__training-step">
            {{ tutorialProgressLabel }}
          </div>
          <div v-else class="hud__training-step">
            Обучение отключено вручную. Можно включить в любой момент.
          </div>
        </div>
        <div class="hud__training-actions">
          <button class="training__button" @click="toggleTutorial">
            {{ tutorialEnabled ? 'Отключить обучение' : 'Включить обучение' }}
          </button>
          <button class="training__button" @click="resetTutorial">
            Сбросить шаги
          </button>
        </div>
      </div>
    </header>

    <div class="toast-stack" aria-live="polite">
      <div
        v-for="note in notifications"
        :key="note.id"
        class="toast"
        :class="`toast--${note.type}`"
      >
        {{ note.message }}
      </div>
    </div>

    <main class="game-grid">
      <nav class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-bar__button"
          :class="{
            'tab-bar__button--active': activeTab === tab.id,
            'tab-bar__button--locked': isTabLocked(tab.id)
          }"
          :disabled="isTabLocked(tab.id)"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section v-if="tutorialEnabled" class="panel panel--tutorial">
        <div class="panel__header">
          <h2>Навигация обучения</h2>
          <span>Режим ведёт по ключевым действиям и открывает вкладки по шагам.</span>
        </div>
        <div class="tutorial-card">
          <div class="tutorial-card__meta">
            <span class="pill">Шаг {{ currentTutorialIndex + 1 }} / {{ tutorialSteps.length }}</span>
            <span class="pill pill--dark">{{ tutorialStatusLabel }}</span>
          </div>
          <h3 class="tutorial-card__title">{{ currentTutorialStep.title }}</h3>
          <p class="tutorial-card__text">{{ currentTutorialStep.text }}</p>
          <div class="tutorial-card__hint">
            {{ tutorialActionHint }}
          </div>
          <div class="tutorial-card__locked" v-if="lockedTabsHint">
            {{ lockedTabsHint }}
          </div>
        </div>
      </section>

      <section v-show="activeTab === 'control'" class="panel panel--story">
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
            <button
              :disabled="isGameOver || isActionLocked('gatherPlasma')"
              @click="gatherPlasma"
              @mouseenter="setActionHint('gatherPlasma')"
              @focus="setActionHint('gatherPlasma')"
              @mouseleave="clearActionHint"
              @blur="clearActionHint"
            >
              🌊 Сбор плазмы
              <span class="action-cost">Стоимость: ⚡1</span>
            </button>
            <button
              :disabled="isGameOver || isActionLocked('refineClots')"
              @click="refineClots"
              @mouseenter="setActionHint('refineClots')"
              @focus="setActionHint('refineClots')"
              @mouseleave="clearActionHint"
              @blur="clearActionHint"
            >
              🧪 Синтез сгустков
              <span class="action-cost">Стоимость: ⚡1 • 💧18</span>
            </button>
            <button
              :disabled="isGameOver || isActionLocked('transmuteEssence')"
              @click="transmuteEssence"
              @mouseenter="setActionHint('transmuteEssence')"
              @focus="setActionHint('transmuteEssence')"
              @mouseleave="clearActionHint"
              @blur="clearActionHint"
            >
              🔮 Возгонка эссенции
              <span class="action-cost">Стоимость: ⚡2 • 🩸12</span>
            </button>
            <button
              :disabled="isGameOver || isActionLocked('reinforceMasking')"
              @click="reinforceMasking"
              @mouseenter="setActionHint('reinforceMasking')"
              @focus="setActionHint('reinforceMasking')"
              @mouseleave="clearActionHint"
              @blur="clearActionHint"
            >
              🕶️ Усилить маскировку
              <span class="action-cost">Стоимость: ⚡1 • ✨2</span>
            </button>
          </div>
        </div>
        <div class="action-group">
          <h3>Тактика и движение</h3>
          <div class="actions">
            <button
              :disabled="isGameOver || isActionLocked('scanFlow')"
              @click="scanFlow"
              @mouseenter="setActionHint('scanFlow')"
              @focus="setActionHint('scanFlow')"
              @mouseleave="clearActionHint"
              @blur="clearActionHint"
            >
              🛰️ Разведка потока
              <span class="action-cost">Стоимость: ⚡1</span>
            </button>
            <button
              :disabled="isGameOver || isActionLocked('stabilizeCore')"
              @click="stabilizeCore"
              @mouseenter="setActionHint('stabilizeCore')"
              @focus="setActionHint('stabilizeCore')"
              @mouseleave="clearActionHint"
              @blur="clearActionHint"
            >
              🧩 Стабилизировать ядро
              <span class="action-cost">Стоимость: ⚡2 • 💧20 • ✨1</span>
            </button>
            <button
              :disabled="isGameOver || isActionLocked('advanceFront')"
              @click="advanceFront"
              @mouseenter="setActionHint('advanceFront')"
              @focus="setActionHint('advanceFront')"
              @mouseleave="clearActionHint"
              @blur="clearActionHint"
            >
              🧭 Прорыв фронтира
              <span class="action-cost">Стоимость: ⚡2 • ✨4</span>
            </button>
          </div>
        </div>
        <div class="action-insight">
          <h3>Что делает выбранное действие</h3>
          <p class="action-insight__title">{{ activeHint.title }}</p>
          <p class="action-insight__text">{{ activeHint.description }}</p>
          <div class="action-insight__effect">{{ activeHint.effect }}</div>
        </div>
        <div class="rates">
          <div>Пассивная плазма: {{ plasmaRate.toFixed(1) }}/сек.</div>
          <div>Атака: {{ attackPower }} • Защита: {{ defensePower }}</div>
        </div>
        <div class="harvest-mode">
          <h3>Контур добычи</h3>
          <p>Выберите режим сбора, чтобы регулировать риск и эффективность.</p>
          <div class="harvest-mode__grid">
            <button
              v-for="mode in harvestModes"
              :key="mode.id"
              class="harvest-mode__button"
              :class="{ 'harvest-mode__button--active': harvestModeId === mode.id }"
              @click="setHarvestMode(mode.id)"
            >
              <strong>{{ mode.name }}</strong>
              <span>{{ mode.description }}</span>
              <span class="harvest-mode__meta">
                Плазма ×{{ mode.plasmaMultiplier }} • Угроза {{ formatSigned(mode.threatDelta) }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section v-show="activeTab === 'map'" class="panel panel--map">
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

      <section v-show="activeTab === 'map'" class="panel panel--details">
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
              :disabled="isGameOver || selectedNode.cleared || isActionLocked('exploreNode')"
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

      <section v-show="activeTab === 'development'" class="panel panel--modules">
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
            <div class="module-card__meta">
              <span class="pill">Категория: {{ module.category }}</span>
              <span class="pill">Уровень ветки: {{ module.tier }}</span>
              <span class="pill">Ветка: {{ module.branch }}</span>
              <span class="pill">Модуль: {{ module.level }} / {{ module.maxLevel }}</span>
            </div>
            <div class="module-card__effects">
              <span
                v-for="effect in formatEffects(module.effects)"
                :key="effect"
                class="pill pill--dark"
              >
                {{ effect }}
              </span>
            </div>
            <div class="module-card__cost">
              <span v-if="module.cost.clots">🩸 {{ module.cost.clots }}</span>
              <span v-if="module.cost.plasma">💧 {{ module.cost.plasma }}</span>
              <span v-if="module.cost.essence">✨ {{ module.cost.essence }}</span>
            </div>
            <div class="module-card__actions">
              <button
                :disabled="
                  module.unlocked ||
                  !canUnlockModule(module.id) ||
                  isGameOver ||
                  isActionLocked('unlockModule')
                "
                @click="unlockModule(module.id)"
              >
                {{ module.unlocked ? 'Установлено' : 'Интегрировать' }}
              </button>
              <button
                class="module-card__upgrade"
                :disabled="
                  !module.unlocked ||
                  module.level >= module.maxLevel ||
                  !canUpgradeModule(module.id) ||
                  isGameOver
                "
                @click="upgradeModule(module.id)"
              >
                Улучшить модуль
              </button>
              <div v-if="module.requires?.length" class="module-card__requires">
                Требуется: {{ module.requires.join(', ') }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-show="activeTab === 'combat'" class="panel panel--combat">
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

      <section v-show="activeTab === 'development'" class="panel panel--doctrine">
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
                v-if="selectedDoctrineId === doctrine.id && doctrine.unlocked"
                class="tag tag--success"
              >
                Выбрано
              </span>
            </div>
            <p>{{ doctrine.description }}</p>
            <div class="module-card__meta">
              <span class="pill">Фокус: {{ doctrine.focus }}</span>
              <span class="pill">Ветка: {{ doctrine.branch }}</span>
              <span class="pill">Уровень ветки: {{ doctrine.tier }}</span>
              <span class="pill">Сила доктрины: {{ doctrine.level }} / {{ doctrine.maxLevel }}</span>
            </div>
            <div class="module-card__effects">
              <span
                v-for="effect in formatEffects(doctrine.effects)"
                :key="effect"
                class="pill pill--dark"
              >
                {{ effect }}
              </span>
            </div>
            <div class="module-card__cost">
              <span v-if="doctrine.cost.clots">🩸 {{ doctrine.cost.clots }}</span>
              <span v-if="doctrine.cost.plasma">💧 {{ doctrine.cost.plasma }}</span>
              <span v-if="doctrine.cost.essence">✨ {{ doctrine.cost.essence }}</span>
            </div>
            <div class="doctrine-card__actions">
              <button
                :disabled="
                  isGameOver ||
                  doctrine.unlocked ||
                  !canUnlockDoctrine(doctrine.id) ||
                  isActionLocked('unlockDoctrine')
                "
                @click="unlockDoctrine(doctrine.id)"
              >
                {{ doctrine.unlocked ? 'Принята' : 'Принять' }}
              </button>
              <button
                class="doctrine-card__activate"
                :disabled="!doctrine.unlocked || selectedDoctrineId === doctrine.id"
                @click="activateDoctrine(doctrine.id)"
              >
                Активировать
              </button>
              <button
                class="doctrine-card__upgrade"
                :disabled="
                  !doctrine.unlocked ||
                  doctrine.level >= doctrine.maxLevel ||
                  !canUpgradeDoctrine(doctrine.id)
                "
                @click="upgradeDoctrine(doctrine.id)"
              >
                Усилить
              </button>
            </div>
            <div v-if="doctrine.requires?.length" class="module-card__requires">
              Требуется: {{ doctrine.requires.join(', ') }}
            </div>
          </div>
        </div>
      </section>

      <section v-show="activeTab === 'development'" class="panel panel--research">
        <div class="panel__header">
          <h2>Дерево добычи</h2>
          <span>Развивайте ветки ресурсов, открывая подуровни технологий.</span>
        </div>
        <div class="research-grid">
          <div
            v-for="upgrade in resourceUpgrades"
            :key="upgrade.id"
            class="research-card"
          >
            <div class="research-card__header">
              <h3>{{ upgrade.name }}</h3>
              <span v-if="upgrade.unlocked" class="tag tag--success">Открыто</span>
            </div>
            <p>{{ upgrade.description }}</p>
            <div class="module-card__meta">
              <span class="pill">Ветка: {{ upgrade.branch }}</span>
              <span class="pill">Уровень: {{ upgrade.tier }}</span>
              <span class="pill">Сила: {{ upgrade.level }} / {{ upgrade.maxLevel }}</span>
            </div>
            <div class="module-card__effects">
              <span
                v-for="effect in formatResourceEffects(upgrade.effects)"
                :key="effect"
                class="pill pill--dark"
              >
                {{ effect }}
              </span>
            </div>
            <div class="module-card__cost">
              <span v-if="upgrade.cost.clots">🩸 {{ upgrade.cost.clots }}</span>
              <span v-if="upgrade.cost.plasma">💧 {{ upgrade.cost.plasma }}</span>
              <span v-if="upgrade.cost.essence">✨ {{ upgrade.cost.essence }}</span>
            </div>
            <div class="module-card__actions">
              <button
                :disabled="
                  upgrade.unlocked ||
                  !canUnlockResource(upgrade.id) ||
                  isGameOver ||
                  isActionLocked('unlockResource')
                "
                @click="unlockResourceUpgrade(upgrade.id)"
              >
                {{ upgrade.unlocked ? 'Открыто' : 'Активировать' }}
              </button>
              <button
                class="module-card__upgrade"
                :disabled="
                  !upgrade.unlocked ||
                  upgrade.level >= upgrade.maxLevel ||
                  !canUpgradeResource(upgrade.id)
                "
                @click="upgradeResourceUpgrade(upgrade.id)"
              >
                Улучшить
              </button>
            </div>
            <div v-if="upgrade.requires?.length" class="module-card__requires">
              Требуется: {{ upgrade.requires.join(', ') }}
            </div>
          </div>
        </div>
      </section>

      <section v-show="activeTab === 'system'" class="panel panel--save">
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
            <button class="save-reset" @click="handleReset">
              🔄 Сбросить прогресс
            </button>
          </div>
          <div v-if="saveStatus" class="save-status">{{ saveStatus }}</div>
        </div>
      </section>

      <section v-show="activeTab === 'system'" class="panel panel--faq">
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

      <section v-show="activeTab === 'journal'" class="panel panel--log">
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

      <section v-show="activeTab === 'journal'" class="panel panel--notifications">
        <div class="panel__header">
          <h2>Оперативные уведомления</h2>
          <span>Подсказки о нехватке ресурсов и событиях.</span>
        </div>
        <div class="notification-list">
          <div
            v-for="note in notifications"
            :key="note.id"
            class="notification-item"
            :class="`notification-item--${note.type}`"
          >
            {{ note.message }}
          </div>
          <p v-if="!notifications.length" class="notification-empty">
            Здесь будут появляться свежие уведомления.
          </p>
        </div>
      </section>

      <section v-show="activeTab === 'system'" class="panel panel--training">
        <div class="panel__header">
          <h2>Режим обучения</h2>
          <span>Включите подсказки или сразу переходите к основной игре.</span>
        </div>
        <div class="training">
          <div class="training__toggle">
            <button
              class="training__button"
              :class="{ 'training__button--active': tutorialEnabled }"
              @click="toggleTutorial"
            >
              {{ tutorialEnabled ? 'Обучение включено' : 'Включить обучение' }}
            </button>
            <button class="training__button" @click="resetTutorial">
              Перезапустить этапы
            </button>
          </div>
          <div v-if="tutorialEnabled" class="training__steps">
            <div
              v-for="(step, index) in tutorialSteps"
              :key="step.id"
              class="training__step"
              :class="{
                'training__step--active': tutorialStep === index,
                'training__step--done': tutorialStep > index
              }"
            >
              <div class="training__title">
                {{ index + 1 }}. {{ step.title }}
              </div>
              <div class="training__text">{{ step.text }}</div>
            </div>
          </div>
          <p v-else class="training__note">
            Подсказки скрыты. Вы можете включить обучение в любой момент.
          </p>
        </div>
      </section>

      <section v-show="activeTab === 'achievements'" class="panel panel--achievements">
        <div class="panel__header">
          <h2>Достижения</h2>
          <span>Коллекция ключевых успехов и прогресса.</span>
        </div>
        <div class="achievement-grid">
          <div
            v-for="achievement in achievements"
            :key="achievement.id"
            class="achievement-card"
            :class="{ 'achievement-card--unlocked': achievement.unlocked }"
          >
            <div class="achievement-card__header">
              <h3>{{ achievement.title }}</h3>
              <span class="tag" :class="achievement.unlocked ? 'tag--success' : 'tag--warning'">
                {{ achievement.unlocked ? 'Открыто' : 'В процессе' }}
              </span>
            </div>
            <p>{{ achievement.description }}</p>
            <div v-if="achievement.target" class="achievement-card__progress">
              <div class="bar">
                <div
                  class="bar__fill"
                  :style="{
                    width: `${Math.min(100, ((achievement.progress ?? 0) / achievement.target) * 100)}%`
                  }"
                ></div>
              </div>
              <span>{{ achievement.progress ?? 0 }} / {{ achievement.target }}</span>
            </div>
          </div>
        </div>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
  resourceUpgrades,
  achievements,
  harvestModes,
  harvestModeId,
  selectedDoctrineId,
  tutorialSteps,
  log,
  notifications,
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
  unlockModule,
  upgradeModule,
  unlockDoctrine,
  upgradeDoctrine,
  activateDoctrine,
  unlockResourceUpgrade,
  upgradeResourceUpgrade,
  gatherPlasma,
  refineClots,
  transmuteEssence,
  reinforceMasking,
  scanFlow,
  stabilizeCore,
  advanceFront,
  setHarvestMode,
  exploreNode,
  attackEnemy,
  burst,
  focus,
  guard,
  retreat,
  generateSaveCode,
  loadFromCode,
  resetGame,
  tutorialEnabled,
  tutorialStep,
  tick
} = useGameState()

const tabs = [
  { id: 'control', label: 'Управление' },
  { id: 'map', label: 'Карта' },
  { id: 'development', label: 'Развитие' },
  { id: 'combat', label: 'Бой' },
  { id: 'journal', label: 'Журнал' },
  { id: 'achievements', label: 'Достижения' },
  { id: 'system', label: 'Система' }
]

const activeTab = ref('control')

const actionHints: Record<
  string,
  { title: string; description: string; effect: string }
> = {
  gatherPlasma: {
    title: 'Сбор плазмы',
    description: 'Базовая добыча, которая подпитывает производство и энергию.',
    effect: 'Даёт плазму и немного опыта.'
  },
  refineClots: {
    title: 'Синтез сгустков',
    description: 'Преобразует плазму в сгустки для модулей и боевых всплесков.',
    effect: 'Обменивает 💧 на 🩸, повышая боевой запас.'
  },
  transmuteEssence: {
    title: 'Возгонка эссенции',
    description: 'Редкий ресурс для доктрин, маскировки и прорыва.',
    effect: 'Меняет 🩸 на ✨, открывая продвинутые действия.'
  },
  reinforceMasking: {
    title: 'Усилить маскировку',
    description: 'Снижает угрозу и защищает от иммунных всплесков.',
    effect: 'Поднимает 🛡️ маскировку и сбрасывает угрозу.'
  },
  scanFlow: {
    title: 'Разведка потока',
    description: 'Снижает угрозу и может открыть новый сектор.',
    effect: 'Уменьшает 👁️ угрозу, шанс обнаружить сектор.'
  },
  stabilizeCore: {
    title: 'Стабилизировать ядро',
    description: 'Восстанавливает целостность, если хватает ресурсов.',
    effect: 'Лечит 🫀 ядро и повышает устойчивость.'
  },
  advanceFront: {
    title: 'Прорыв фронтира',
    description: 'Открывает новые маршруты ценой эссенции.',
    effect: 'Расширяет карту и повышает угрозу.'
  }
}

const activeHint = ref(actionHints.gatherPlasma)

const setActionHint = (key: keyof typeof actionHints) => {
  activeHint.value = actionHints[key]
}

const clearActionHint = () => {
  activeHint.value = actionHints.gatherPlasma
}

const tutorialFlow = [
  {
    allowedTabs: ['control'],
    allowedActions: ['gatherPlasma'],
    hint: 'Выполните сбор плазмы, чтобы двигаться дальше.'
  },
  {
    allowedTabs: ['control'],
    allowedActions: ['refineClots'],
    hint: 'Синтезируйте сгустки для запуска модулей.'
  },
  {
    allowedTabs: ['development'],
    allowedActions: ['unlockModule'],
    hint: 'Перейдите в «Развитие» и откройте модуль.'
  },
  {
    allowedTabs: ['map'],
    allowedActions: ['exploreNode'],
    hint: 'На карте исследуйте ближайший сектор.'
  },
  {
    allowedTabs: ['development'],
    allowedActions: ['unlockDoctrine'],
    hint: 'Примите доктрину и активируйте ветку развития.'
  },
  {
    allowedTabs: ['map', 'combat'],
    allowedActions: ['exploreNode', 'attackEnemy', 'burst'],
    hint: 'Запустите боевой сектор и победите врага.'
  }
]

const currentTutorialIndex = computed(() =>
  Math.min(tutorialStep.value, tutorialSteps.length - 1)
)

const tutorialCompleted = computed(
  () => tutorialStep.value >= tutorialSteps.length
)

const currentTutorialStep = computed(() =>
  tutorialCompleted.value ? tutorialSteps[tutorialSteps.length - 1] : tutorialSteps[currentTutorialIndex.value]
)

const tutorialGate = computed(() =>
  tutorialCompleted.value ? null : tutorialFlow[currentTutorialIndex.value]
)

const tutorialStatusLabel = computed(() =>
  tutorialCompleted.value ? 'Обучение завершено' : 'Следуйте подсказкам'
)

const tutorialActionHint = computed(() =>
  tutorialGate.value?.hint ?? 'Свободный режим активен.'
)

const lockedTabsHint = computed(() => {
  if (!tutorialGate.value || tutorialCompleted.value) return ''
  const allowed = tutorialGate.value.allowedTabs.join(', ')
  return `Доступны вкладки: ${allowed}. Остальные открываются по шагам.`
})

const tutorialProgressLabel = computed(() => {
  if (tutorialCompleted.value) return 'Все шаги обучения завершены.'
  return `Шаг ${currentTutorialIndex.value + 1}/${tutorialSteps.length}: ${currentTutorialStep.value.title}`
})

const isTabLocked = (tabId: string) => {
  if (!tutorialEnabled.value || tutorialCompleted.value) return false
  return !tutorialGate.value?.allowedTabs.includes(tabId)
}

const isActionLocked = (actionId: string) => {
  if (!tutorialEnabled.value || tutorialCompleted.value) return false
  return !tutorialGate.value?.allowedActions.includes(actionId)
}

const toggleTutorial = () => {
  tutorialEnabled.value = !tutorialEnabled.value
}

const resetTutorial = () => {
  tutorialStep.value = 0
}

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

const handleReset = () => {
  resetGame()
  saveCode.value = ''
  saveStatus.value = 'Прогресс сброшен.'
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
    case 'vault':
      return 'Хранилище'
    default:
      return 'Неизвестно'
  }
}

const formatEffects = (effects: {
  attack?: number
  defense?: number
  plasmaRate?: number
  masking?: number
  energy?: number
  integrity?: number
}) => {
  const entries = [
    effects.attack ? `Атака +${effects.attack}` : null,
    effects.defense ? `Защита +${effects.defense}` : null,
    effects.plasmaRate ? `Плазма +${effects.plasmaRate}` : null,
    effects.masking ? `Маскировка +${effects.masking}` : null,
    effects.energy ? `Энергия +${effects.energy}` : null,
    effects.integrity ? `Целостность +${effects.integrity}` : null
  ]
  return entries.filter(Boolean) as string[]
}

const canAfford = (cost: { clots?: number; plasma?: number; essence?: number }) => {
  const hasClots = cost.clots === undefined || clots.value >= cost.clots
  const hasPlasma = cost.plasma === undefined || plasma.value >= cost.plasma
  const hasEssence = cost.essence === undefined || essence.value >= cost.essence
  return hasClots && hasPlasma && hasEssence
}

const canUnlockModule = (moduleId: string) => {
  const module = modules.value.find(item => item.id === moduleId)
  if (!module) return false
  if (module.requires?.length) {
    const hasRequires = module.requires.every(id =>
      modules.value.some(candidate => candidate.id === id && candidate.unlocked)
    )
    if (!hasRequires) return false
  }
  return canAfford(module.cost)
}

const canUpgradeModule = (moduleId: string) => {
  const module = modules.value.find(item => item.id === moduleId)
  if (!module || !module.unlocked || module.level >= module.maxLevel) return false
  const cost = module.upgradeCosts[module.level - 1]
  if (!cost) return false
  return canAfford(cost)
}

const canUnlockDoctrine = (doctrineId: string) => {
  const doctrine = doctrines.value.find(item => item.id === doctrineId)
  if (!doctrine) return false
  if (doctrine.requires?.length) {
    const hasRequires = doctrine.requires.every(id =>
      doctrines.value.some(candidate => candidate.id === id && candidate.unlocked)
    )
    if (!hasRequires) return false
  }
  return canAfford(doctrine.cost)
}

const canUpgradeDoctrine = (doctrineId: string) => {
  const doctrine = doctrines.value.find(item => item.id === doctrineId)
  if (!doctrine || !doctrine.unlocked || doctrine.level >= doctrine.maxLevel) {
    return false
  }
  const cost = doctrine.upgradeCosts[doctrine.level - 1]
  if (!cost) return false
  return canAfford(cost)
}

const canUnlockResource = (upgradeId: string) => {
  const upgrade = resourceUpgrades.value.find(item => item.id === upgradeId)
  if (!upgrade) return false
  if (upgrade.requires?.length) {
    const hasRequires = upgrade.requires.every(id =>
      resourceUpgrades.value.some(candidate => candidate.id === id && candidate.unlocked)
    )
    if (!hasRequires) return false
  }
  return canAfford(upgrade.cost)
}

const canUpgradeResource = (upgradeId: string) => {
  const upgrade = resourceUpgrades.value.find(item => item.id === upgradeId)
  if (!upgrade || !upgrade.unlocked || upgrade.level >= upgrade.maxLevel) return false
  const cost = upgrade.upgradeCosts[upgrade.level - 1]
  if (!cost) return false
  return canAfford(cost)
}

const formatResourceEffects = (effects: {
  plasmaYield?: number
  clotYield?: number
  essenceYield?: number
  plasmaCostReduction?: number
  clotCostReduction?: number
  essenceCostReduction?: number
  threatShift?: number
  experienceBonus?: number
}) => {
  const entries = [
    effects.plasmaYield ? `Плазма +${Math.round(effects.plasmaYield * 100)}%` : null,
    effects.clotYield ? `Сгустки +${Math.round(effects.clotYield * 100)}%` : null,
    effects.essenceYield ? `Эссенция +${Math.round(effects.essenceYield * 100)}%` : null,
    effects.plasmaCostReduction
      ? `Расход плазмы -${Math.round(effects.plasmaCostReduction * 100)}%`
      : null,
    effects.clotCostReduction
      ? `Расход сгустков -${Math.round(effects.clotCostReduction * 100)}%`
      : null,
    effects.essenceCostReduction
      ? `Расход эссенции -${Math.round(effects.essenceCostReduction * 100)}%`
      : null,
    effects.threatShift ? `Угроза ${formatSigned(effects.threatShift)}` : null,
    effects.experienceBonus
      ? `Опыт +${Math.round(effects.experienceBonus * 100)}%`
      : null
  ]
  return entries.filter(Boolean) as string[]
}

const formatSigned = (value: number) =>
  value > 0 ? `+${value}` : `${value}`

let timer: number | null = null

onMounted(() => {
  timer = window.setInterval(() => tick(), 1000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>
