<template>
  <Dialog
    v-model:visible="visible"
    :modal="true"
    :dismissable-mask="true"
    style="max-width: 560px; width: 95vw"
  >
    <template #header>
      <PlayerWithPicture
        :username="username"
        :name-first="false"
        class="kopf"
        @click="visible = false"
      />
    </template>

    <p v-if="fehler === 'USER_NOT_FOUND'">{{ t('Moderation.nutzerNichtGefunden') }}</p>
    <p v-else-if="fehler != null">{{ t('Moderation.fehler') }}</p>
    <div
      v-else-if="verlauf == null"
      class="laden"
    >
      <i class="pi pi-spinner pi-spin" />
    </div>
    <template v-else>
      <div
        v-if="aktiveSperre != null"
        class="sperre-aktiv"
      >
        <div>
          <strong>{{ t('Moderation.gesperrtBis', { datum: new Date(aktiveSperre.blockedUntil).toLocaleString() }) }}</strong>
          <div
            v-if="aktiveSperre.reason != null && aktiveSperre.reason !== ''"
            class="leise"
          >
            {{ aktiveSperre.reason }}
          </div>
        </div>
        <Button
          size="small"
          severity="secondary"
          icon="pi pi-unlock"
          :label="t('Moderation.entsperren')"
          @click="entsperren"
        />
      </div>
      <BlockUserForm
        v-else
        :username="verlauf.username"
        @blocked="geaendert"
      />

      <h4 class="ueberschrift">{{ t('Moderation.verlauf') }}</h4>
      <p
        v-if="eintraege.length === 0"
        class="leise"
      >
        {{ t('Moderation.keinVerlauf') }}
      </p>
      <ul
        v-else
        class="zeitleiste"
      >
        <li
          v-for="(e, i) in eintraege"
          :key="i"
        >
          <i
            :class="['pi', e.art === 'sperre' ? 'pi-ban sperre' : 'pi-flag']"
            aria-hidden="true"
          />
          <div class="inhalt">
            <template v-if="e.art === 'sperre'">
              <div>
                <strong>{{ t('Moderation.sperre') }}</strong>
                <span class="leise">
                  · {{ t('Moderation.bis', { datum: new Date(e.sperre.blockedUntil).toLocaleDateString() }) }} ·
                  {{ e.sperre.moderator ?? t('Moderation.geloeschterNutzer') }}
                  <template v-if="!altesDatum(e.sperre)">· {{ new Date(e.sperre.created).toLocaleDateString() }}</template>
                </span>
              </div>
              <div
                v-if="e.sperre.reason != null && e.sperre.reason !== ''"
                class="text"
              >
                {{ e.sperre.reason }}
              </div>
            </template>
            <ReportList
              v-else
              :reports="[e.meldung]"
            />
          </div>
        </li>
      </ul>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
// Moderation eines Spielers (#254): sperren oder entsperren, darunter der Verlauf aus Sperren und Meldungen.
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BlockUserForm from '@/components/Moderation/BlockUserForm.vue'
import ReportList from '@/components/Moderation/ReportList.vue'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'
import { injectStrict, SocketKey } from '@/services/injections'
import type { HandledReport, ModerationBlock, UserModerationHistory } from '@/../../server/src/sharedTypes/typesReports'

const props = defineProps<{ username: string }>()
const emit = defineEmits<{ changed: [] }>()
const visible = defineModel<boolean>('visible', { required: true })

const { t } = useI18n()
const toast = useToast()
const socket = injectStrict(SocketKey)

const verlauf = ref<UserModerationHistory | null>(null)
const fehler = ref<string | null>(null)

type Eintrag = { art: 'sperre'; zeit: number; sperre: ModerationBlock } | { art: 'meldung'; zeit: number; meldung: HandledReport }

// Die Sperre, die am längsten läuft
const aktiveSperre = computed(() => {
  const until = verlauf.value?.blockedUntil
  return until == null ? null : (verlauf.value?.blocks.find((b) => b.blockedUntil === until) ?? { blockedUntil: until, reason: null, created: until, moderator: null })
})

// Sperren von vor der Spalte 'created' tragen das Datum der Migration: es liegt nach dem Ende der Sperre
const altesDatum = (b: ModerationBlock) => new Date(b.created) > new Date(b.blockedUntil)

// Sperren und Meldungen in einer Zeitleiste, die neuesten oben
const eintraege = computed<Eintrag[]>(() => {
  if (verlauf.value == null) return []
  return [
    ...verlauf.value.blocks.map((b): Eintrag => ({ art: 'sperre', zeit: new Date(altesDatum(b) ? b.blockedUntil : b.created).getTime(), sperre: b })),
    ...verlauf.value.reports.map((r): Eintrag => ({ art: 'meldung', zeit: new Date(r.created).getTime(), meldung: r })),
  ].sort((a, b) => b.zeit - a.zeit)
})

async function laden() {
  fehler.value = null
  const res = await socket.emitWithAck(5000, 'moderation:history', props.username)
  if (res.status === 200 && res.data != null) verlauf.value = res.data
  else fehler.value = typeof res.error === 'string' ? res.error : 'ERROR'
}

watch(
  () => [visible.value, props.username],
  () => {
    if (!visible.value) return
    verlauf.value = null
    laden()
  },
  { immediate: true }
)

async function geaendert() {
  emit('changed')
  await laden()
}

async function entsperren() {
  const res = await socket.emitWithAck(5000, 'moderation:unblock', props.username)
  if (res.status !== 200) toast.add({ severity: 'error', life: 5000, summary: t('Moderation.fehler') })
  await geaendert()
}
</script>

<style scoped>
.kopf {
  font-size: 1.2rem;
  font-weight: 600;
}
.laden {
  text-align: center;
  padding: 20px;
}
.sperre-aktiv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--p-red-500) 10%, transparent);
}
.ueberschrift {
  margin: 20px 0 8px 0;
  font-size: small;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
}
.leise {
  opacity: 0.7;
  font-weight: normal;
}
.zeitleiste {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: small;
  overflow-wrap: anywhere;
}
.zeitleiste li {
  display: flex;
  gap: 10px;
  padding: 6px 0;
}
.zeitleiste li + li {
  border-top: 1px solid var(--p-content-border-color);
}
.zeitleiste .pi {
  margin-top: 3px;
  opacity: 0.5;
}
.zeitleiste .pi.sperre {
  color: var(--p-red-500);
  opacity: 1;
}
.inhalt {
  flex: 1;
  min-width: 0;
}
.text {
  margin-top: 2px;
  opacity: 0.85;
}
</style>
