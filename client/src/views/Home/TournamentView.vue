<template>
  <div class="p-card tournamentPage">
    <Button
      v-if="router.currentRoute.value.name !== 'TournamentOverview'"
      :label="t('Tournament.backButton')"
      icon="pi pi-backward"
      class="buttonBack"
      text
      rounded
      severity="secondary"
      size="small"
      @click="router.push({ name: 'TournamentOverview' })"
    />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import router from '@/router'

const { t } = useI18n()
</script>

<style scoped>
.tournamentPage {
  flex: 0 1 800px;
  max-width: 100%;
  position: relative;
  padding: 15px;
}

.buttonBack {
  position: absolute;
  left: 5px;
  top: 5px;
}
</style>
