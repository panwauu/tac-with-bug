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
    </li>
  </ul>
</template>

<script setup lang="ts">
// Kompakte Liste von Meldungen: Kategorie, Melder, Datum, die gemeldete Chatnachricht und der Text des Melders
import { useI18n } from 'vue-i18n'
import type { HandledReport, Report } from '@/../../server/src/sharedTypes/typesReports'

defineProps<{ reports: (Report | HandledReport)[] }>()
const { t } = useI18n()
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
</style>
