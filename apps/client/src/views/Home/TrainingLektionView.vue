<template>
  <div
    v-if="l != null"
    class="lektion"
  >
    <div class="lektion-kopf">
      <Button
        icon="pi pi-angle-left"
        :label="t('Training.uebersicht')"
        severity="secondary"
        text
        @click="router.push({ name: 'Training' })"
      />
      <Tag :value="txt(stufe?.name, locale)" />
    </div>
    <div class="lektion-inhalt p-card">
      <div class="lektion-text">
        <h2>{{ txt(l.titel, locale) }}</h2>
        <p
          v-for="(absatz, i) in absaetze"
          :key="i"
        >
          {{ absatz }}
        </p>
        <div class="knoepfe">
          <Button
            v-if="l.uebungen.length > 0"
            :label="t('Training.zurUebung')"
            icon="pi pi-play"
            @click="zurUebung()"
          />
          <Button
            v-else-if="ziel"
            :label="t('Training.weiter')"
            icon="pi pi-angle-right"
            icon-pos="right"
            @click="weiter()"
          />
          <Button
            v-else
            :label="t('Training.uebersicht')"
            icon="pi pi-check"
            @click="weiter()"
          />
        </div>
      </div>
      <div class="lektion-bild">
        <TrainingBrett :szene="szene" />
      </div>
    </div>
    <TrainingFeier />
  </div>
</template>

<script setup lang="ts">
// Eine Lektion des Trainings: Text und bewegtes Bild, danach die Übung
// dazu (falls es eine gibt) oder das nächste Feld des Lernpfads.
import { computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useI18n } from 'vue-i18n'
import router from '@/router'
import TrainingBrett from '@/components/TrainingBrett.vue'
import TrainingFeier from '@/components/TrainingFeier.vue'
import { lektion, txt, markiere, naechstes, training } from '@/training'
import { szeneFuer } from '@/training/bilder'

const { t, locale } = useI18n()
const id = computed(() => String(router.currentRoute.value.params.id ?? ''))
const l = computed(() => lektion(id.value))
const stufe = computed(() => training.stufen.find((s) => s.nr === l.value?.stufe))
const absaetze = computed(() =>
  txt(l.value?.text, locale.value)
    .split(/\n+/)
    .filter((a) => a.trim() !== '')
)
const szene = computed(() => (l.value ? szeneFuer(l.value.id, l.value.bild) : []))
const ziel = computed(() => (l.value ? naechstes(l.value.id) : null))

function zurUebung() {
  const x = l.value
  if (x == null) return
  // Reine Leselektion zählt mit dem Öffnen der Übung als gelesen; erledigt
  // ist das Feld erst, wenn auch die Übung gelöst ist.
  markiere(x.id)
  router.push({ name: 'TrainingUebung', query: { id: x.uebungen[0] } })
}

function weiter() {
  const x = l.value
  if (x == null) return
  markiere(x.id)
  const z = ziel.value
  if (z == null) router.push({ name: 'Training' })
  else if (z.art === 'lektion') router.push({ name: 'TrainingLektion', params: { id: z.id } })
  else router.push({ name: 'TrainingUebung', query: { id: z.id } })
}

onMounted(() => {
  if (l.value == null) router.replace({ name: 'Training' })
})
</script>

<style scoped>
.lektion {
  flex: 0 1 1100px;
  max-width: 100%;
  padding: 10px;
}
.lektion-kopf {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.lektion-inhalt {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  padding: 20px;
  align-items: start;
}
@media (max-width: 800px) {
  .lektion-inhalt {
    grid-template-columns: minmax(0, 1fr);
  }
  .lektion-bild {
    order: -1;
  }
}
.lektion-text h2 {
  margin-top: 0;
}
.knoepfe {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
</style>
