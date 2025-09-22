<template>
  <img
    :src="imageSrc"
    alt="Tac Spielbrett"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ nPlayers: number; turned: boolean }>()

const imageSrc = computed(() => {
  return new URL(`../../assets/board/${imageName.value}`, import.meta.url).href
})

const imageName = computed(() => {
  if (props.nPlayers === 4) {
    return 'board.jpg'
  }
  if (props.nPlayers === 6 && !props.turned) {
    return 'board6.png'
  }
  return 'board6_turned.png'
})
</script>
