<template>
  <div class="moderation">
    <div class="moderation-kopfzeile">
      <h2>{{ t('Moderation.titel') }}</h2>
      <PlayersAutoComplete
        v-if="moderationStore.moderator"
        v-model:username="gesuchterSpieler"
        class="moderation-suche"
      />
    </div>

    <p v-if="!moderationStore.moderator">{{ t('Moderation.keinZugang') }}</p>
    <Tabs
      v-else
      v-model:value="tab"
    >
      <TabList>
        <Tab value="meldungen">
          {{ t('Moderation.meldungen') }}
          <Badge
            v-if="reportedUsers.length > 0"
            :value="reportedUsers.length"
            severity="danger"
            size="small"
          />
        </Tab>
        <Tab value="gesperrt">
          {{ t('Moderation.gesperrteSpieler') }}
          <span
            v-if="gesperrte.length > 0"
            class="moderation-zahl"
          >
            {{ gesperrte.length }}
          </span>
        </Tab>
        <Tab
          v-if="moderationStore.admin"
          value="moderatoren"
        >
          {{ t('Moderation.moderatoren') }}
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="meldungen">
          <p class="moderation-hinweis">{{ t('Moderation.einleitung') }}</p>
          <p
            v-if="reportedUsers.length === 0"
            class="moderation-leer"
          >
            {{ t('Moderation.keineMeldungen') }}
          </p>
          <div
            v-for="u in reportedUsers"
            :key="u.username"
            class="moderation-eintrag"
          >
            <div class="moderation-zeile">
              <button
                type="button"
                class="moderation-name"
                @click="verlaufOeffnen(u.username)"
              >
                <PlayerWithPicture
                  :username="u.username"
                  :name-first="false"
                  :clickable="false"
                />
              </button>
              <Tag
                v-if="u.blockedUntil != null"
                severity="danger"
                :value="t('Moderation.gesperrtBis', { datum: datum(u.blockedUntil) })"
              />
              <div class="moderation-aktionen">
                <Button
                  size="small"
                  severity="danger"
                  outlined
                  :label="t('Moderation.pruefen')"
                  @click="verlaufOeffnen(u.username)"
                />
                <Button
                  size="small"
                  severity="secondary"
                  text
                  :label="t('Moderation.ablehnen')"
                  @click="aktion('moderation:dismiss', u.username)"
                />
              </div>
            </div>
            <ReportList :reports="u.reports" />
          </div>
        </TabPanel>

        <TabPanel value="gesperrt">
          <p
            v-if="gesperrte.length === 0"
            class="moderation-leer"
          >
            {{ t('Moderation.keineGesperrten') }}
          </p>
          <div
            v-for="b in gesperrte"
            :key="b.username"
            class="moderation-eintrag moderation-zeile"
          >
            <button
              type="button"
              class="moderation-name"
              @click="verlaufOeffnen(b.username)"
            >
              <PlayerWithPicture
                :username="b.username"
                :name-first="false"
                :clickable="false"
              />
            </button>
            <span class="moderation-leise">
              {{ t('Moderation.bis', { datum: datum(b.blockedUntil) }) }}
              <template v-if="b.reason != null && b.reason !== ''">· {{ b.reason }}</template>
            </span>
            <Button
              class="moderation-aktionen"
              size="small"
              severity="secondary"
              text
              icon="pi pi-unlock"
              :label="t('Moderation.entsperren')"
              @click="aktion('moderation:unblock', b.username)"
            />
          </div>
        </TabPanel>

        <TabPanel
          v-if="moderationStore.admin"
          value="moderatoren"
        >
          <p
            v-if="moderatoren.length === 0"
            class="moderation-leer"
          >
            {{ t('Moderation.keineModeratoren') }}
          </p>
          <div
            v-for="m in moderatoren"
            :key="m"
            class="moderation-eintrag moderation-zeile"
          >
            <PlayerWithPicture
              :username="m"
              :name-first="false"
            />
            <Button
              class="moderation-aktionen"
              size="small"
              text
              severity="secondary"
              icon="pi pi-times"
              :aria-label="t('Moderation.entfernen')"
              @click="setzeModerator(m, false)"
            />
          </div>
          <form
            class="moderation-zeile moderation-neu"
            @submit.prevent="setzeModerator(neuerModerator ?? '', true)"
          >
            <PlayersAutoComplete
              v-model:username="neuerModerator"
              :players-to-avoid="moderatoren"
              class="moderation-suche"
            />
            <Button
              type="submit"
              size="small"
              :label="t('Moderation.ernennen')"
              :disabled="neuerModerator == null || neuerModerator === ''"
            />
          </form>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <ModerationUserDialog
      v-if="verlaufSpieler != null"
      v-model:visible="verlaufSichtbar"
      :username="verlaufSpieler"
      @changed="laden"
    />
  </div>
</template>

<script setup lang="ts">
// Moderation (#254): offene Meldungen, gesperrte Spieler und (für Admins) die Moderatoren.
// Sperren, Entsperren und der Verlauf eines Spielers liegen im Dialog, damit die Liste übersichtlich bleibt.
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModerationUserDialog from '@/components/Moderation/ModerationUserDialog.vue'
import ReportList from '@/components/Moderation/ReportList.vue'
import PlayersAutoComplete from '@/components/PlayersAutoComplete.vue'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'
import { injectStrict, SocketKey } from '@/services/injections'
import { useModerationStore } from '@/store/moderation'
import type { BlockedUser, ReportedUser } from '@/../../server/src/sharedTypes/typesReports'

const { t } = useI18n()
const toast = useToast()
const socket = injectStrict(SocketKey)
const moderationStore = useModerationStore()

const tab = ref('meldungen')
const reportedUsers = ref<ReportedUser[]>([])
const gesperrte = ref<BlockedUser[]>([])
const moderatoren = ref<string[]>([])
const neuerModerator = ref<string | null>(null)
const gesuchterSpieler = ref<string | null>(null)
const verlaufSpieler = ref<string | null>(null)
const verlaufSichtbar = ref(false)

const datum = (d: string) => new Date(d).toLocaleDateString()

async function laden() {
  if (!moderationStore.moderator) return
  const res = await socket.emitWithAck(5000, 'moderation:reports')
  if (res.status === 200 && res.data != null) reportedUsers.value = res.data
  const b = await socket.emitWithAck(5000, 'moderation:blocked')
  if (b.status === 200 && b.data != null) gesperrte.value = b.data
  if (moderationStore.admin) {
    const m = await socket.emitWithAck(5000, 'moderation:moderators')
    if (m.status === 200 && m.data != null) moderatoren.value = m.data
  }
}

// Neu laden, wenn der Status kommt oder sich die Zahl der Meldungen ändert
watch(() => [moderationStore.moderator, moderationStore.openReports], laden, { immediate: true })

// Ein Spieler aus der Suche öffnet gleich seinen Verlauf
watch(gesuchterSpieler, (name) => {
  if (name == null || name === '') return
  verlaufOeffnen(name)
  gesuchterSpieler.value = null
})

function verlaufOeffnen(username: string) {
  verlaufSpieler.value = username
  verlaufSichtbar.value = true
}

function ergebnis(status: number) {
  if (status !== 200) toast.add({ severity: 'error', life: 5000, summary: t('Moderation.fehler') })
}

async function aktion(ereignis: 'moderation:unblock' | 'moderation:dismiss', username: string) {
  const res = await socket.emitWithAck(5000, ereignis, username)
  ergebnis(res.status)
  await laden()
}

async function setzeModerator(username: string, moderator: boolean) {
  if (username === '') return
  const res = await socket.emitWithAck(5000, 'moderation:setModerator', { username, moderator })
  ergebnis(res.status)
  if (res.status === 200 && res.data != null) {
    moderatoren.value = res.data
    neuerModerator.value = null
  }
}
</script>

<style scoped>
.moderation {
  flex: 0 1 800px;
  max-width: 100%;
  padding: 10px;
  text-align: left;
}
.moderation-kopfzeile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.moderation-kopfzeile h2 {
  margin: 0;
}
.moderation-suche {
  flex: 0 1 260px;
}
.moderation-hinweis {
  margin: 0 0 12px 0;
  font-size: small;
  opacity: 0.7;
}
.moderation-leer {
  text-align: center;
  opacity: 0.7;
  padding: 20px 0;
}
.moderation-zahl {
  margin-left: 6px;
  opacity: 0.6;
}
.moderation-eintrag {
  padding: 12px 0;
  border-bottom: 1px solid var(--p-content-border-color);
}
.moderation-eintrag:last-of-type {
  border-bottom: none;
}
.moderation-zeile {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.moderation-name {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  padding: 0;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.moderation-name:hover {
  text-decoration: underline;
}
.moderation-leise {
  font-size: small;
  opacity: 0.7;
  overflow-wrap: anywhere;
}
.moderation-aktionen {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.moderation-eintrag :deep(.meldungen) {
  margin-top: 8px;
  padding-left: 35px;
}
.moderation-neu {
  margin-top: 12px;
}
</style>
