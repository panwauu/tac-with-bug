<template>
  <h2>{{ t('Ki.titel') }}</h2>
  <p>{{ t('Ki.widgetText') }}</p>
  <div>
    <Button
      :label="t('Ki.zurAuswahl')"
      icon="pi pi-angle-right"
      icon-pos="right"
      @click="router.push({ name: 'KiAuswahl' })"
    />
  </div>
</template>

<script setup lang="ts">
// Kachel auf der Startseite: führt zur Auswahl der KI-Gegner.
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import router from '@/router'

const { t } = useI18n()
</script>
