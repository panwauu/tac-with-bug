<template>
  <div class="bots">
    <h2 class="bots-titel">{{ t('Bots.titel') }}</h2>
    <div class="bots-info p-card">
      <p>{{ t('Bots.einleitung') }}</p>
      <p>{{ t('Bots.andere') }}</p>
    </div>
    <div class="bots-kacheln">
      <div
        v-for="m in modi"
        :key="m.modus"
        class="bots-kachel p-card"
      >
        <h2>{{ t(`Ki.modus.${m.modus}`) }}</h2>
        <div
          v-for="id in m.bots"
          :id="`bot-${id}`"
          :key="id"
          class="bots-eintrag"
        >
          <div class="bots-name">
            {{ botInfo(id, t).name }}
            <span
              v-if="botInfo(id, t).schwierigkeit != null"
              class="bots-stufe"
            >
              {{ botInfo(id, t).schwierigkeit }}
            </span>
          </div>
          <div>{{ botInfo(id, t).beschreibung }}</div>
        </div>
      </div>
    </div>
    <div class="bots-info p-card bots-frueher">
      <h3>{{ t('Bots.frueher') }}</h3>
      <p>{{ t('Bots.frueherText') }}</p>
      <div
        v-for="id in [0, 1, 2]"
        :id="`bot-${id}`"
        :key="id"
        class="bots-eintrag"
      >
        <div class="bots-name">{{ botInfo(id, t).name }}</div>
        <div>{{ botInfo(id, t).beschreibung }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Übersicht der Bots (#252): welche es je Spielart gibt und wie sie spielen.
// Am Brett verlinkt das Fenster eines Bots hierher (Anker bot-<Nummer>).
import { useI18n } from 'vue-i18n'
import { botInfo, onlineBots } from '@/views/kiStufen'

const { t } = useI18n()

const modi = [
  { modus: 'klassisch', bots: onlineBots(4, 2, false).map((b) => b.id) },
  { modus: 'drei', bots: onlineBots(6, 2, false).map((b) => b.id) },
  { modus: 'koop', bots: onlineBots(4, 2, true).map((b) => b.id) },
]
</script>

<style scoped>
.bots {
  flex: 0 1 1200px;
  max-width: 100%;
  padding: 10px;
  text-align: left;
}
.bots-titel {
  margin-top: 0;
  text-align: center;
}
.bots-info {
  padding: 0px 15px 5px 15px;
  margin-bottom: 20px;
  line-height: 1.5;
}
.bots-frueher {
  margin-top: 20px;
  margin-bottom: 0;
  padding-bottom: 15px;
}
.bots-kacheln {
  display: grid;
  grid-gap: 20px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
}
@media (max-width: 800px) {
  .bots-kacheln {
    grid-template-columns: minmax(0, 1fr);
  }
}
.bots-kachel {
  padding: 0px 15px 15px 15px;
}
.bots-kachel h2 {
  text-align: center;
}
.bots-eintrag {
  padding: 8px 0;
  border-top: 1px solid var(--p-content-border-color);
  line-height: 1.4;
}
.bots-name {
  font-weight: bold;
  margin-bottom: 2px;
}
.bots-stufe {
  font-weight: normal;
  opacity: 0.7;
  margin-left: 6px;
}
</style>
