<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <div class="tournamentCreationElement">
      <label>{{ t('Tournament.CreatePrivate.tournamentName') }}</label>
      <InputText
        v-model="title"
        mode="decimal"
        :use-grouping="false"
        :class="{ 'p-invalid': !titleValid }"
      />
      <small
        v-if="!titleValid"
        class="custom-invalid"
      >
        {{ t('Tournament.CreatePrivate.tournamentNameInvalid') }}
      </small>
    </div>

    <div class="tournamentCreationElement">
      <label style="margin-bottom: 10px">{{ t('Tournament.CreatePrivate.playersAndTeams') }}</label>
      <div style="display: flex; flex-direction: column; align-items: flex-start">
        <div class="field-radiobutton">
          <RadioButton
            id="city1"
            v-model="playersAndTeamsSettings"
            name="city"
            value="4p"
            class="radioButton"
          />
          <label for="city1">{{ t('Tournament.CreatePrivate.4p') }}</label>
        </div>
        <div class="field-radiobutton">
          <RadioButton
            id="city2"
            v-model="playersAndTeamsSettings"
            name="city"
            value="6p2t"
            class="radioButton"
          />
          <label for="city2">{{ t('Tournament.CreatePrivate.6p2t') }}</label>
        </div>
        <div class="field-radiobutton">
          <RadioButton
            id="city3"
            v-model="playersAndTeamsSettings"
            name="city"
            value="6p3t"
            class="radioButton"
          />
          <label for="city3">{{ t('Tournament.CreatePrivate.6p3t') }}</label>
        </div>
      </div>
    </div>

    <div class="tournamentCreationElement">
      <label style="margin-bottom: 10px">{{ t('Tournament.CreatePrivate.nTeams') }} {{ Math.pow(playersAndTeamsSettings === '6p3t' ? 3 : 2, nRounds) }}</label>
      <Slider
        v-model="nRounds"
        :min="2"
        :max="8"
        style="width: 200px"
      />
    </div>

    <Button
      label="Turnier erstellen"
      :disabled="!titleValid || settingsStore.isBlockedByModeration"
      @click="createPrivateTournament()"
    />
    <BlockedByModerationMessage
      v-if="settingsStore.isBlockedByModeration"
      :blocked-by-moderation-until="settingsStore.blockedByModerationUntil ?? ''"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Slider from 'primevue/slider'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import RadioButton from 'primevue/radiobutton'

import { ref, computed } from 'vue'
import { injectStrict, SocketKey } from '@/services/injections'
import router from '@/router'
import { useToast } from 'primevue/usetoast'
import { useSettingsStore } from '@/store/settings'
import BlockedByModerationMessage from '../BlockedByModerationMessage.vue'
const toast = useToast()

const settingsStore = useSettingsStore()
const socket = injectStrict(SocketKey)

const title = ref('')
const playersAndTeamsSettings = ref<'4p' | '6p2t' | '6p3t'>('4p')
const nRounds = ref(2)

const titleValid = computed(() => title.value.length >= 8)

async function createPrivateTournament() {
  const res = await socket.emitWithAck(5000, 'tournament:private:create', {
    title: title.value,
    nTeams: Math.pow(playersAndTeamsSettings.value === '6p3t' ? 3 : 2, nRounds.value),
    playersPerTeam: playersAndTeamsSettings.value === '6p2t' ? 3 : 2,
    teamsPerMatch: playersAndTeamsSettings.value === '6p3t' ? 3 : 2,
    tournamentType: 'KO',
  })
  if (res.data == null) {
    console.error('Tournament not created')
    toast.add({
      severity: 'success',
      summary: t('Toast.GenericError.summary'),
      detail: t('Toast.GenericError.detail'),
      life: 5000,
    })
    return
  }

  toast.add({
    severity: 'success',
    summary: t('Tournament.CreatePrivate.createdSummary'),
    detail: t('Tournament.CreatePrivate.createdDetail'),
    life: 5000,
  })
  return router.push({ name: 'PrivateTournament', params: { id: res.data.id } })
}
</script>

<style scoped>
.tournamentCreationElement {
  display: flex;
  flex-direction: column;
  margin: 15px;
}

.radioButton {
  margin-right: 10px;
}
</style>
