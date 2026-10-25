<template>
  <div class="ki-auswahl">
    <h2 class="ki-titel">{{ t('Ki.titel') }}</h2>
    <div class="ki-info p-card">
      <h3>{{ t('Ki.infoTitel') }}</h3>
      <ul>
        <li>{{ t('Ki.infoBrowser') }}</li>
        <li>{{ t('Ki.infoStatistik') }}</li>
        <li>{{ t('Ki.infoSpeichern') }}</li>
        <li>{{ t('Ki.hinweis') }}</li>
        <li>{{ t('Ki.infoMenschen') }}</li>
      </ul>
    </div>
    <div class="ki-kacheln">
      <div class="ki-kachel p-card">
        <h2>{{ t('Ki.modus.klassisch') }}</h2>
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
      </div>
      <div class="ki-kachel p-card">
        <h2>{{ t('Ki.modus.drei') }}</h2>
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
      </div>
      <div class="ki-kachel p-card">
        <h2>{{ t('Ki.modus.koop') }}</h2>
        <p>{{ t('Ki.beschreibungKoop') }}</p>
        <div class="ki-stufen">
          <Button
            :label="t('Ki.modus.koop')"
            severity="secondary"
            @click="starteKiPartie('koop', 'koop')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Auswahl der KI-Partie: eine normale Seite im Layout (Kopfleiste, Scrollen),
// je Modus eine Kachel wie auf der Startseite, darüber was eine KI-Partie bedeutet.
// Die Partie selbst ist die Vollbild-Ansicht KiView.
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import { KI_STUFEN, KI_STUFEN_DREI, starteKiPartie } from '@/views/kiStufen'

const { t } = useI18n()
</script>

<style scoped>
.ki-auswahl {
  flex: 0 1 1200px;
  max-width: 100%;
  padding: 10px;
  text-align: center;
}
.ki-titel {
  margin-top: 0;
}
.ki-kacheln {
  display: grid;
  grid-gap: 20px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 800px) {
  .ki-kacheln {
    grid-template-columns: minmax(0, 1fr);
  }
}
.ki-kachel {
  padding: 0px 15px 15px 15px;
  display: flex;
  flex-direction: column;
}
.ki-stufen {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ki-info {
  padding: 0px 15px 5px 15px;
  margin-bottom: 20px;
  text-align: left;
}
.ki-info h3 {
  margin-bottom: 0.4em;
}
.ki-info ul {
  margin-top: 0;
  padding-left: 1.2em;
  line-height: 1.5;
}
</style>
