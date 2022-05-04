<template>
  <div class="p-card tournamentPage">
    <Button
      v-if="$route.name != 'TournamentOverview'"
      :label="$t('Tournament.backButton')"
      icon="pi pi-backward"
      class="p-button-rounded p-button-sm p-button-text p-button-secondary buttonBack"
      @click="$router.push({ name: 'TournamentOverview' })"
    />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
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