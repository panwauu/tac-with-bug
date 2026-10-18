<template>
  <div class="ki-auswahl">
    <h2>{{ t('Ki.titel') }}</h2>
    <h3>{{ t('Ki.modus.klassisch') }}</h3>
    <p>{{ t('Ki.beschreibung') }}</p>
    <div class="ki-stufen">
      <Button
        v-for="s in KI_STUFEN"
        :key="s.name"
        :label="`${s.titel} (${t(`Ki.schwierigkeit.${s.stufe}`)})`"
        severity="secondary"
        @click="starteKiPartie('klassisch', s.name)"
      />
    </div>
    <h3>{{ t('Ki.modus.drei') }}</h3>
    <p>{{ t('Ki.beschreibungDrei') }}</p>
    <div class="ki-stufen">
      <Button
        v-for="s in KI_STUFEN_DREI"
        :key="s.name"
        :label="`${s.titel} (${t(`Ki.schwierigkeit.${s.stufe}`)})`"
        severity="secondary"
        @click="starteKiPartie('drei', s.name)"
      />
    </div>
    <h3>{{ t('Ki.modus.koop') }}</h3>
    <p>{{ t('Ki.beschreibungKoop') }}</p>
    <div class="ki-stufen">
      <Button
        :label="t('Ki.modus.koop')"
        severity="secondary"
        @click="starteKiPartie('koop', 'koop')"
      />
    </div>
    <p class="ki-hinweis">{{ t('Ki.hinweis') }}</p>
  </div>
</template>

<script setup lang="ts">
// Auswahl der KI-Partie: eine normale Seite im Layout (Kopfleiste, Scrollen).
// Die Partie selbst ist die Vollbild-Ansicht KiView.
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import { KI_STUFEN, KI_STUFEN_DREI, starteKiPartie } from '@/views/kiStufen'

const { t } = useI18n()
</script>

<style scoped>
.ki-auswahl {
  max-width: 560px;
  margin: 8px auto 32px;
  padding: 0 16px;
  text-align: center;
}
.ki-auswahl h2 {
  margin-top: 0;
}
.ki-stufen {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 24px 0;
}
.ki-hinweis {
  font-size: 0.85em;
  opacity: 0.7;
}
</style>
