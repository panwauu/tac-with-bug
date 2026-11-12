<template>
  <ul class="meldungen">
    <li
      v-for="(r, i) in reports"
      :key="i"
    >
      <div class="meldung-kopf">
        <span>{{ t(`Moderation.kategorie.${r.category}`) }}</span>
        <span class="leise">· {{ r.reporter ?? t('Moderation.geloeschterNutzer') }} · {{ new Date(r.created).toLocaleDateString() }}</span>
        <span
          v-if="'handled' in r && r.handled == null"
          class="offen"
        >
          {{ t('Moderation.offen') }}
        </span>
      </div>
      <blockquote
        v-if="r.message != null"
        class="zitat"
      >
        {{ r.message }}
      </blockquote>
      <div
        v-if="r.body !== ''"
        class="text"
      >
        {{ r.body }}
      </div>
      <button
        v-if="r.message != null"
        type="button"
        class="verlauf-knopf"
        @click="umschalten(r.id)"
      >
        <i :class="offen.has(r.id) ? 'pi pi-chevron-up' : 'pi pi-comments'" />
        {{ offen.has(r.id) ? t('Moderation.kontext.ausblenden') : t('Moderation.kontext.zeigen') }}
      </button>
      <ReportContextView
        v-if="r.message != null && offen.has(r.id)"
        :report-i-d="r.id"
        :username="username"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
// Kompakte Liste von Meldungen: Kategorie, Melder, Datum, die gemeldete Chatnachricht und der Text des Melders.
// Bei Chatnachrichten lässt sich der Chat darum aufklappen (ReportContextView).
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import ReportContextView from './ReportContextView.vue'
import type { HandledReport, Report } from '@/../../server/src/sharedTypes/typesReports'

defineProps<{ reports: (Report | HandledReport)[]; username: string }>()
const { t } = useI18n()

// Meldungen, deren Chatverlauf gerade aufgeklappt ist
const offen = reactive(new Set<number>())
function umschalten(id: number) {
  if (offen.has(id)) offen.delete(id)
  else offen.add(id)
}
</script>

<style scoped>
.meldungen {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: small;
  overflow-wrap: anywhere;
}
.meldungen li + li {
  margin-top: 6px;
}
.meldung-kopf {
  font-weight: 600;
}
.leise {
  margin-left: 0.25em;
  font-weight: normal;
  opacity: 0.7;
}
.offen {
  margin-left: 6px;
  font-weight: normal;
  color: var(--p-orange-500);
}
.zitat {
  margin: 3px 0 0 0;
  padding: 2px 8px;
  border-left: 2px solid var(--p-content-border-color);
  white-space: pre-line;
}
.text {
  margin-top: 2px;
  opacity: 0.85;
}
.verlauf-knopf {
  margin-top: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--p-primary-color);
  font-size: small;
  cursor: pointer;
}
.verlauf-knopf i {
  font-size: 0.85em;
  margin-right: 3px;
}
</style>
