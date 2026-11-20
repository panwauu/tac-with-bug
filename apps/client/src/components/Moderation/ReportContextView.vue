<template>
  <div class="kontext">
    <p
      v-if="laedt"
      class="leise"
    >
      {{ t('Moderation.kontext.laedt') }}
    </p>
    <p
      v-else-if="kontext == null"
      class="leise"
    >
      {{ t('Moderation.kontext.nichtGefunden') }}
    </p>
    <template v-else>
      <div class="ort">{{ ort }}</div>
      <div
        v-if="kontext.moreBefore"
        class="leise mehr"
      >
        {{ t('Moderation.kontext.aeltere') }}
      </div>
      <ol class="nachrichten">
        <li
          v-for="(m, i) in kontext.messages"
          :key="i"
          :class="{ gemeldet: m.reported, vomGemeldeten: m.sender === username && !m.reported }"
        >
          <span class="zeit">{{ zeit(m.created) }}</span>
          <span class="absender">{{ m.sender ?? t('Moderation.geloeschterNutzer') }}</span>
          <span class="text">{{ m.body }}</span>
        </li>
      </ol>
      <div
        v-if="kontext.moreAfter"
        class="leise mehr"
      >
        {{ t('Moderation.kontext.neuere') }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Der Chat um eine gemeldete Nachricht: was dazu geführt hat und wie es weiterging.
// Nur der Chat, in dem gemeldet wurde, nie andere Chats des Spielers.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { injectStrict, SocketKey } from '@/services/injections'
import type { ReportContext } from '@/../../server/src/sharedTypes/typesReports'

const props = defineProps<{ reportID: number; username: string }>()
const { t } = useI18n()
const socket = injectStrict(SocketKey)

const laedt = ref(true)
const kontext = ref<ReportContext | null>(null)

onMounted(async () => {
  const res = await socket.emitWithAck(5000, 'moderation:reportContext', props.reportID)
  if (res.status === 200 && res.data != null) kontext.value = res.data
  laedt.value = false
})

const ort = computed(() => {
  const p = kontext.value?.place
  if (p == null) return ''
  if (p.type === 'game') return t('Moderation.kontext.partie', { nr: p.gameID })
  if (p.type === 'waiting') return t('Moderation.kontext.warteraum')
  if (p.type === 'channel') return t('Moderation.kontext.kanal', { name: p.channel })
  const leute = p.members.join(', ')
  return p.group ? t('Moderation.kontext.gruppe', { name: p.groupName ?? '', leute }) : t('Moderation.kontext.privat', { leute })
})

const zeit = (d: string) => new Date(d).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<style scoped>
.kontext {
  margin: 6px 0 2px 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--p-content-hover-background);
  font-size: small;
}
.ort {
  font-weight: 600;
  margin-bottom: 4px;
}
.leise {
  margin: 0;
  opacity: 0.7;
}
.mehr {
  font-style: italic;
}
.nachrichten {
  list-style: none;
  margin: 0;
  padding: 0;
}
.nachrichten li {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 4px;
  overflow-wrap: anywhere;
}
.zeit {
  opacity: 0.6;
  white-space: nowrap;
}
.absender {
  font-weight: 600;
  white-space: nowrap;
}
.text {
  white-space: pre-line;
}
.vomGemeldeten .absender {
  color: var(--p-red-500);
}
.gemeldet {
  background: color-mix(in srgb, var(--p-red-500) 18%, transparent);
}
.gemeldet .absender {
  color: var(--p-red-600);
}
</style>
