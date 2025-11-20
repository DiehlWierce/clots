<!-- ClotParticle.vue -->
<template>
  <div
    class="clot-particle"
    :style="{
      left: initialX + 'px',
      top: initialY + 'px',
      color: isActive ? '#c7245c' : '#6b1a36',
      fontSize: size + 'px'
    }"
  >
    ◉
  </div>
</template>

<script setup lang="ts">
defineProps<{
  initialX: number
  initialY: number
  isActive?: boolean
  size?: number
}>()
</script>

<style scoped>
.clot-particle {
  position: absolute;
  transform: translate(-50%, -50%); /* 🔥 ключевая строчка — иначе "точка роста" в левом верхнем углу символа */
  pointer-events: none;
  animation: float-up 3s ease-out forwards;
}

@keyframes float-up {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -150px) scale(0.8); }
}
</style>