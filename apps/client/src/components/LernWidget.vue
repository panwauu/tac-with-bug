<template>
  <h2>{{ t('Training.titel') }}</h2>
  <p>{{ t('Training.widgetText') }}</p>
  <div>
    <Button
      :label="t('Training.zumTraining')"
      icon="pi pi-angle-right"
      icon-pos="right"
      @click="router.push({ name: 'Training' })"
    />
  </div>
</template>

<script setup lang="ts">
// Kachel auf der Startseite: führt zum Training (Lektionen und Übungen aus der App).
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import router from '@/router'

const { t } = useI18n()
</script>
