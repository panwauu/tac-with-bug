<template>
  <div class="training">
    <h2 class="training-titel">{{ t('Training.titel') }}</h2>
    <p class="training-einleitung">{{ t('Training.einleitung') }}</p>
    <div class="training-stufen">
      <div
        v-for="s in training.stufen"
        :key="s.nr"
        class="training-stufe p-card"
      >
        <div class="stufe-kopf">
          <h3>{{ txt(s.name, locale) }}</h3>
          <Tag
            :value="`${anzahlErledigt(s.nr)} / ${pfad(s.nr).length}`"
            :severity="anzahlErledigt(s.nr) === pfad(s.nr).length ? 'success' : 'secondary'"
          />
        </div>
        <p class="stufe-kurz">{{ txt(s.kurz, locale) }}</p>
        <div class="stufe-felder">
          <Button
            v-for="f in pfad(s.nr)"
            :key="f.id"
            :label="titel(f)"
            :icon="feldErledigt(f) ? 'pi pi-check' : f.art === 'lektion' ? 'pi pi-book' : 'pi pi-play'"
            :severity="feldErledigt(f) ? 'success' : 'secondary'"
            outlined
            class="stufe-feld"
            @click="oeffne(f)"
          />
        </div>
      </div>
    </div>
    <p class="training-hinweis">{{ t('Training.hinweis') }}</p>
    <TrainingFeier />
  </div>
</template>

<script setup lang="ts">
// Das Training der TAC-App im Browser: fünf Stufen, je ein Lernpfad aus
// Lektionen (lesen, Bild) und Übungen (auf dem Brett lösen).
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useI18n } from 'vue-i18n'
import router from '@/router'
import TrainingFeier from '@/components/TrainingFeier.vue'
import { training, txt, pfad, feldErledigt, lektion, uebung } from '@/training'

const { t, locale } = useI18n()

function titel(f: { art: 'lektion' | 'uebung'; id: string }) {
  return txt(f.art === 'lektion' ? lektion(f.id)?.titel : uebung(f.id)?.titel, locale.value)
}

function anzahlErledigt(stufe: number) {
  return pfad(stufe).filter(feldErledigt).length
}

function oeffne(f: { art: 'lektion' | 'uebung'; id: string }) {
  if (f.art === 'lektion') router.push({ name: 'TrainingLektion', params: { id: f.id } })
  else router.push({ name: 'TrainingUebung', query: { id: f.id } })
}
</script>

<style scoped>
.training {
  flex: 0 1 1200px;
  max-width: 100%;
  padding: 10px;
}
.training-titel,
.training-einleitung,
.training-hinweis {
  text-align: center;
}
.training-titel {
  margin-top: 0;
}
.training-stufen {
  display: grid;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}
@media (max-width: 700px) {
  .training-stufen {
    grid-template-columns: minmax(0, 1fr);
  }
}
.training-stufe {
  padding: 0 15px 15px 15px;
}
.stufe-kopf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.stufe-kurz {
  margin-top: 0;
  opacity: 0.8;
}
.stufe-felder {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stufe-feld {
  justify-content: flex-start;
  text-align: left;
}
.training-hinweis {
  font-size: 0.85em;
  opacity: 0.7;
}
</style>
