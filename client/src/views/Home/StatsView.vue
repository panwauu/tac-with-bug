<template>
  <div class="p-card stats">
    <h1>{{ t('Stats.headerTable') }}</h1>
    <FunFactsCarousel :use-p-card-style="false" />
    <PlatformStats />
  </div>
</template>

<script setup lang="ts">
import FunFactsCarousel from '@/components/FunFactsCarousel.vue'
import PlatformStats from '@/components/PlatformStats/PlatformStats.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 1 800px;
  max-width: 100%;
  padding: 20px;
}
</style>
