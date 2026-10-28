<template>
  <div class="moderation">
    <h2 class="moderation-titel">{{ t('Moderation.titel') }}</h2>
    <div
      v-if="!moderationStore.moderator"
      class="p-card moderation-karte"
    >
      <p>{{ t('Moderation.keinZugang') }}</p>
    </div>
    <template v-else>
      <div class="p-card moderation-karte">
        <p>{{ t('Moderation.einleitung') }}</p>
      </div>

      <p
        v-if="reportedUsers.length === 0"
        class="moderation-leer"
      >
        {{ t('Moderation.keineMeldungen') }}
      </p>
      <div
        v-for="u in reportedUsers"
        :key="u.username"
        class="p-card moderation-karte"
      >
        <div class="moderation-kopf">
          <ProfilePicture
            :username="u.username"
            class="moderation-bild"
          />
          <div>
            <router-link :to="{ name: 'Profile', params: { username: u.username } }">
              <strong>{{ u.username }}</strong>
            </router-link>
            <Tag
              v-if="u.blockedUntil != null"
              severity="danger"
              class="moderation-tag"
              :value="t('Moderation.gesperrtBis', { datum: new Date(u.blockedUntil).toLocaleString() })"
            />
            <p
              v-if="u.userDescription !== ''"
              class="moderation-profiltext"
            >
              {{ u.userDescription }}
            </p>
          </div>
        </div>
        <ul class="moderation-meldungen">
          <li
            v-for="(r, i) in u.reports"
            :key="i"
          >
            <strong>{{ t(`Moderation.kategorie.${r.category}`) }}</strong>
            · {{ r.reporter ?? t('Moderation.geloeschterNutzer') }} · {{ new Date(r.created).toLocaleString() }}
            <div v-if="r.body !== ''">{{ r.body }}</div>
          </li>
        </ul>
        <div class="moderation-aktionen">
          <Select
            v-model="tage[u.username]"
            :options="dauerOptionen"
            option-label="label"
            option-value="value"
            :placeholder="t('Moderation.dauer')"
          />
          <InputText
            v-model="grund[u.username]"
            :placeholder="t('Moderation.sperrgrund')"
            maxlength="200"
          />
          <div class="moderation-check">
            <Checkbox
              v-model="zuruecksetzen[u.username]"
              :input-id="`reset-${u.username}`"
              binary
            />
            <label :for="`reset-${u.username}`">{{ t('Moderation.profilZuruecksetzen') }}</label>
          </div>
          <Button
            severity="danger"
            icon="pi pi-ban"
            :label="t('Moderation.sperren')"
            :disabled="tage[u.username] == null || (grund[u.username] ?? '').trim() === ''"
            @click="sperren(u.username)"
          />
          <Button
            v-if="u.blockedUntil != null"
            severity="secondary"
            icon="pi pi-unlock"
            :label="t('Moderation.entsperren')"
            @click="aktion('moderation:unblock', u.username)"
          />
          <Button
            severity="secondary"
            text
            icon="pi pi-check"
            :label="t('Moderation.ablehnen')"
            @click="aktion('moderation:dismiss', u.username)"
          />
        </div>
      </div>

      <div
        v-if="moderationStore.admin"
        class="p-card moderation-karte"
      >
        <h3>{{ t('Moderation.moderatoren') }}</h3>
        <p v-if="moderatoren.length === 0">{{ t('Moderation.keineModeratoren') }}</p>
        <div
          v-for="m in moderatoren"
          :key="m"
          class="moderation-moderator"
        >
          <router-link :to="{ name: 'Profile', params: { username: m } }">{{ m }}</router-link>
          <Button
            size="small"
            text
            severity="danger"
            icon="pi pi-times"
            :aria-label="t('Moderation.entfernen')"
            @click="setzeModerator(m, false)"
          />
        </div>
        <div class="moderation-aktionen">
          <InputText
            v-model="neuerModerator"
            :placeholder="t('Moderation.benutzername')"
          />
          <Button
            icon="pi pi-plus"
            :label="t('Moderation.ernennen')"
            :disabled="neuerModerator.trim() === ''"
            @click="setzeModerator(neuerModerator.trim(), true)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Moderation (#254): offene Meldungen ansehen, sperren, entsperren oder ablehnen.
// Nur für Moderatoren und Admins; Admins ernennen hier auch die Moderatoren.
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProfilePicture from '@/components/ProfilePicture.vue'
import { injectStrict, SocketKey } from '@/services/injections'
import { useModerationStore } from '@/store/moderation'
import type { ReportedUser } from '@/../../server/src/sharedTypes/typesReports'

const { t } = useI18n()
const toast = useToast()
const socket = injectStrict(SocketKey)
const moderationStore = useModerationStore()

const reportedUsers = ref<ReportedUser[]>([])
const moderatoren = ref<string[]>([])
const tage = ref<Record<string, number | undefined>>({})
const grund = ref<Record<string, string>>({})
const zuruecksetzen = ref<Record<string, boolean>>({})
const neuerModerator = ref('')

const dauerOptionen = [1, 7, 30, 365].map((d) => ({ value: d, label: t(`Moderation.dauerTage.d${d}`) }))

async function laden() {
  if (!moderationStore.moderator) return
  const res = await socket.emitWithAck(5000, 'moderation:reports')
  if (res.status === 200 && res.data != null) reportedUsers.value = res.data
  if (moderationStore.admin) {
    const m = await socket.emitWithAck(5000, 'moderation:moderators')
    if (m.status === 200 && m.data != null) moderatoren.value = m.data
  }
}

// Neu laden, wenn der Status kommt oder sich die Zahl der Meldungen ändert
watch(() => [moderationStore.moderator, moderationStore.openReports], laden, { immediate: true })

function ergebnis(status: number) {
  if (status !== 200) toast.add({ severity: 'error', life: 5000, summary: t('Moderation.fehler') })
}

async function sperren(username: string) {
  const res = await socket.emitWithAck(5000, 'moderation:block', {
    username,
    days: tage.value[username] ?? 1,
    reason: (grund.value[username] ?? '').trim(),
    resetProfile: zuruecksetzen.value[username] ?? false,
  })
  ergebnis(res.status)
  await laden()
}

async function aktion(ereignis: 'moderation:unblock' | 'moderation:dismiss', username: string) {
  const res = await socket.emitWithAck(5000, ereignis, username)
  ergebnis(res.status)
  await laden()
}

async function setzeModerator(username: string, moderator: boolean) {
  const res = await socket.emitWithAck(5000, 'moderation:setModerator', { username, moderator })
  ergebnis(res.status)
  if (res.status === 200 && res.data != null) {
    moderatoren.value = res.data
    neuerModerator.value = ''
  }
}
</script>

<style scoped>
.moderation {
  flex: 0 1 900px;
  max-width: 100%;
  padding: 10px;
  text-align: left;
}
.moderation-titel {
  margin-top: 0;
  text-align: center;
}
.moderation-karte {
  padding: 5px 15px 15px 15px;
  margin-bottom: 15px;
}
.moderation-leer {
  text-align: center;
  opacity: 0.7;
}
.moderation-kopf {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding-top: 10px;
}
.moderation-bild {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
}
.moderation-tag {
  margin-left: 8px;
}
.moderation-profiltext {
  margin: 6px 0 0 0;
  font-style: italic;
  overflow-wrap: anywhere;
}
.moderation-meldungen {
  padding-left: 1.2em;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.moderation-aktionen {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.moderation-check {
  display: flex;
  gap: 6px;
  align-items: center;
}
.moderation-moderator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 300px;
}
</style>
