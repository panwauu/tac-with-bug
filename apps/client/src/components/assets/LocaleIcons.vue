<template>
  <img
    :src="imageSrc"
    :alt="`Flag-${countryCode}`"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ countryCode: string }>()

const imageSrc = computed(() => {
  return new URL(`../../assets/localeIcons/${props.countryCode}.svg`, import.meta.url).href
})
</script>
