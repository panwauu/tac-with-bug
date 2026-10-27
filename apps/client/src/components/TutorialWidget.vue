<template>
  <h2>{{ t('Training.titel') }}</h2>
  <div
    v-for="(s, index) in training.stufen"
    :key="`TutorialWidget-${s.nr}`"
  >
    <Divider v-if="index !== 0" />
    <div style="display: flex; justify-content: space-between">
      <div>{{ txt(s.name, locale) }}</div>
      <div>{{ anzahlErledigt(s.nr) }}/{{ pfad(s.nr).length }}</div>
    </div>
    <ProgressBar
      :value="Math.round((anzahlErledigt(s.nr) / pfad(s.nr).length) * 100)"
      :show-value="false"
    />
  </div>
</template>

<script setup lang="ts">
// Kachel auf der Startseite: Fortschritt im Training (Lektionen und Übungen aus der App) je Stufe.
import { useI18n } from 'vue-i18n'
import ProgressBar from 'primevue/progressbar'
import Divider from 'primevue/divider'
import { training, txt, pfad, feldErledigt } from '@/training'

const { t, locale } = useI18n()

function anzahlErledigt(stufe: number) {
  return pfad(stufe).filter(feldErledigt).length
}
</script>
