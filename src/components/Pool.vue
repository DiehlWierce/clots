<!-- Pool.vue -->
<template>
  <div class="pool-wrapper">
    <svg
      ref="svgRef"
      viewBox="0 0 400 300"
      class="pool-svg"
      @click="handleClick"
    >
      <!-- Фон бассейна -->
      <ellipse cx="200" cy="180" rx="140" ry="60" fill="rgba(74, 0, 31, 0.4)" stroke="#c7245c" stroke-width="2" />
      <ellipse cx="200" cy="180" rx="130" ry="50" fill="var(--clot-pool)" opacity="0.6" />

      <!-- Частицы: рендерим как <text> внутри SVG — абсолютно правильное позиционирование -->
      <text
        v-for="p in particles"
        :key="p.id"
        :x="p.x"
        :y="p.y"
        text-anchor="middle"
        dominant-baseline="middle"
        class="clot-particle"
        :class="{ 'clot-active': p.active }"
        :font-size="p.size"
      >
        ◉
      </text>

      <!-- +1: тоже внутри SVG -->
      <text
        v-for="fb in feedbacks"
        :key="fb.id"
        :x="fb.x"
        :y="fb.y"
        text-anchor="middle"
        dominant-baseline="middle"
        class="clot-feedback"
      >
        +1
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useClots } from '@/composables/useClots'

const svgRef = ref<SVGElement | null>(null)
const { addClots } = useClots()
const particles = ref<Array<{ id: number; x: number; y: number; active: boolean; size: number }>>([])
const feedbacks = ref<Array<{ id: number; x: number; y: number }>>([])
let particleId = 0
let feedbackId = 0
let spawnInterval: number | null = null

const spawnParticle = () => {
  if (!svgRef.value) return

  // Параметры жидкости
  const cx = 300, cy = 200, rx = 130, ry = 50
  const angleDeg = 150 + Math.random() * 60 // 150–210°
  const angleRad = (angleDeg * Math.PI) / 180

  const x = cx + rx * Math.cos(angleRad)
  const y = cy + ry * Math.sin(angleRad)

  particles.value.push({
    id: particleId++,
    x,
    y,
    active: Math.random() > 0.3,
    size: 12 + Math.random() * 6
  })

  // Автоудаление через 3 сек (без DOM-анимаций)
  setTimeout(() => {
    particles.value = particles.value.filter(p => p.id !== particleId - 1)
  }, 3000)
}

const handleClick = (e: MouseEvent) => {
  if (!svgRef.value) return

  const svgRect = svgRef.value.getBoundingClientRect()
  const x = e.clientX - svgRect.left
  const y = e.clientY - svgRect.top

  // Преобразуем пиксели → SVG-координаты (обратное преобразование!)
  const pt = svgRef.value.createSVGPoint()
  pt.x = x
  pt.y = y
  const matrix = svgRef.value.getScreenCTM()?.inverse()
  if (!matrix) return
  const svgPoint = pt.matrixTransform(matrix)

  const clicked = particles.value.find(p =>
    Math.hypot(p.x - svgPoint.x, p.y - svgPoint.y) < 25
  )

  if (clicked) {
    addClots(1)
    particles.value = particles.value.filter(p => p.id !== clicked.id)

    // Добавляем +1 в SVG-координатах (не в px!)
    feedbacks.value.push({
      id: feedbackId++,
      x: clicked.x,
      y: clicked.y
    })

    // Удаляем +1 через 1 сек
    setTimeout(() => {
      feedbacks.value = feedbacks.value.filter(f => f.id !== feedbackId - 1)
    }, 1000)
  }
}

onMounted(() => {
  spawnInterval = setInterval(spawnParticle, 900)
})

onUnmounted(() => {
  if (spawnInterval) clearInterval(spawnInterval)
})
</script>

<style scoped>
.pool-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 70vh;
}

.pool-svg {
  width: 90%;
  max-width: 600px;
  height: auto;
  display: block;
  cursor: pointer;
}

.clot-particle {
  fill: #6b1a36;
  pointer-events: none;
}

.clot-particle.clot-active {
  fill: #c7245c;
}

.clot-feedback {
  fill: #e53e5e;
  font-weight: bold;
  font-size: 18px;
  pointer-events: none;
  animation: feedback-rise 1s ease-out forwards;
}

@keyframes feedback-rise {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-60px) scale(1.1);
  }
}
</style>