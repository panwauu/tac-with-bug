<template>
  <img :src="imageSrc" :alt="`Card-${card}`">
</template>

<script setup lang='ts'>
import { computed } from 'vue';

const props = defineProps<{ card: string }>()

const imageSrc = computed(() => {
    return new URL(`../../assets/cards/${props.card}.png`, import.meta.url).href
})
</script>
