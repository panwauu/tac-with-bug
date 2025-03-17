<template>
  <div>
    <Dialog
      v-model:visible="localVisible"
      :modal="true"
      :dismissableMask="true"
    >
      <template #header>
        <h3>{{ t('Waiting.WaitingGameCreator.title') }}</h3>
      </template>

      <div class="filterButtons">
        <SelectButton
          v-model="selectedPlayers"
          class="filterButton"
          :options="playersModel"
          optionLabel="name"
        />
        <SelectButton
          v-model="selectedTeams"
          class="filterButton"
          :options="teamsModel"
          optionLabel="name"
        />
        <SelectButton
          v-model="selectedMeister"
          class="filterButton"
          :options="meisterModel"
          optionLabel="name"
        />
        <SelectButton
          v-model="selectedPrivate"
          class="filterButton"
          :options="privateModel"
          optionLabel="name"
        />
      </div>

      <template #footer>
        <Button
          class="submitButton"
          :label="t('Waiting.WaitingGameCreator.submitButton')"
          icon="pi pi-plus"
          :disabled="!validOptions()"
          @click="createGame()"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import SelectButton from 'primevue/selectbutton'

import { computed, ref } from 'vue'
import { injectStrict, SocketKey } from '@/services/injections'

const props = defineProps<{ visible: boolean }>()
const socket = injectStrict(SocketKey)

const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const localVisible = computed({
  get(): boolean {
    return props.visible
  },
  set(value: boolean): void {
    return emit('update:visible', value)
  },
})

const playersModel = [
  { name: t('Waiting.WaitingGameCreator.player4Name'), value: 4 },
  { name: t('Waiting.WaitingGameCreator.player6Name'), value: 6 },
]
const selectedPlayers = ref(playersModel[0])

const teamsModel = [
  { name: t('Waiting.WaitingGameCreator.teams1Name'), value: 1 },
  { name: t('Waiting.WaitingGameCreator.teams2Name'), value: 2 },
  { name: t('Waiting.WaitingGameCreator.teams3Name'), value: 3 },
]
const selectedTeams = ref(teamsModel[1])

const meisterModel = [
  {
    name: t('Waiting.WaitingGameCreator.meisterTrueName'),
    value: true,
  },
  {
    name: t('Waiting.WaitingGameCreator.meisterFalseName'),
    value: false,
  },
]
const selectedMeister = ref(meisterModel[0])

const privateModel = [
  {
    name: t('Waiting.WaitingGameCreator.privateTrueName'),
    value: true,
  },
  {
    name: t('Waiting.WaitingGameCreator.privateFalseName'),
    value: false,
  },
]
const selectedPrivate = ref(privateModel[1])

const createGame = () => {
  socket.emitWithAck(5000, 'waiting:createGame', {
    nPlayers: selectedPlayers.value.value,
    nTeams: selectedTeams.value.value,
    meister: selectedMeister.value.value,
    private: selectedPrivate.value.value,
  })
  localVisible.value = false
}

const validOptions = () => {
  return (
    selectedPlayers.value != null &&
    selectedTeams.value != null &&
    selectedMeister.value != null &&
    selectedPrivate.value != null &&
    !(selectedTeams.value.value === 3 && selectedPlayers.value.value !== 6)
  )
}
</script>

<style scoped>
.filterButtons {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
}

.filterButton {
  margin: 10px;
}

.submitButton {
  float: left;
}
</style>
