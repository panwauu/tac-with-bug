<template>
  <h2>{{ t('Ki.titel') }}</h2>
  <p>{{ t('Ki.beschreibung') }}</p>
  <div class="ki-widget-stufen">
    <Button
      v-for="s in KI_STUFEN"
      :key="s.name"
      :label="s.titel"
      size="small"
      :severity="s.stufe === 'meister' ? 'contrast' : 'secondary'"
      :title="t(`Ki.schwierigkeit.${s.stufe}`)"
      @click="router.push({ name: 'Ki', query: { stufe: s.name } })"
    />
  </div>
  <Button
    class="ki-widget-alle"
    :label="t('Ki.alleModi')"
    icon="pi pi-angle-right"
    icon-pos="right"
    link
    @click="router.push({ name: 'KiAuswahl' })"
  />
</template>

<script setup lang="ts">
// Kachel auf der Startseite: direkt in eine Partie gegen die KI.
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import router from '@/router'
import { KI_STUFEN } from '@/views/kiStufen'

const { t } = useI18n()
</script>

<style scoped>
.ki-widget-stufen {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ki-widget-alle {
  margin-top: 8px;
}
</style>
