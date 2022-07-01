<template>
  <img :src="imageSrc" :alt="`ball-${props.color}`">
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import { useSettingsStore } from '@/store/settings';

const settingsStore = useSettingsStore()
const props = defineProps<{ color: string }>()

const imageSrc = computed(() => {
    return new URL(`../../assets/balls/${props.color}${settingsStore.colorblind ? '_CB' : ''}.png`, import.meta.url).href
})
</script>
