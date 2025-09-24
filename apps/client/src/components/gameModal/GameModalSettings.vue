<template>
  <div style="max-width: min(600px, 100vw)">
    <h3>{{ t(`Game.GameModal.Settings.audioVolume`) }}</h3>
    <SettingsAudioVolume />
    <h3>{{ t(`Game.GameModal.Settings.colorScheme`) }}</h3>
    <SettingsColorScheme />
    <h3>{{ t(`Game.GameModal.Settings.colorBlindness`) }}</h3>
    <SelectButton
      v-model="localColorBlindness"
      :options="colorBlindnessOptions"
      option-label="name"
      option-value="value"
    />
    <h3>{{ t(`Game.GameModal.Settings.position`) }}</h3>
    <div class="positionContainer">
      <div>
        <RadioButton
          v-model="position"
          name="position_-1"
          :value="-1"
          class="positionCheckBox"
        />
        <label for="position_-1">
          {{ t(`Game.GameModal.Settings.checkBoxAbsolute`) }}
        </label>
      </div>
      <div
        v-for="index in nPlayers"
        :key="`radioButton-${index}`"
      >
        <RadioButton
          v-model="position"
          :name="`position_${index}`"
          :value="index - 1"
          class="positionCheckBox"
        />
        <label :for="`position_${index}`">
          {{ t(`Game.GameModal.Settings.checkBox${nPlayers}_${index - 1}`) }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import SelectButton from 'primevue/selectbutton'
import RadioButton from 'primevue/radiobutton'
import SettingsAudioVolume from '../SettingsView/SettingsAudioVolume.vue'
import SettingsColorScheme from '../SettingsView/SettingsColorScheme.vue'

import type { MiscStateType } from '@/services/compositionGame/useMisc'
import { computed } from 'vue'

import { useSettingsStore } from '@/store/settings'
const settingsStore = useSettingsStore()

const props = defineProps<{ nPlayers: number; miscState: MiscStateType }>()

const position = computed<number>({
  get() {
    return settingsStore.defaultPositions[props.nPlayers === 6 ? 1 : 0]
  },
  set(value) {
    settingsStore.setDefaultPosition(value, props.nPlayers, true)
  },
})

const colorBlindnessOptions = [
  {
    name: t('Game.GameModal.Settings.colorBlindnessOn'),
    value: true,
  },
  {
    name: t('Game.GameModal.Settings.colorBlindnessOff'),
    value: false,
  },
]

const localColorBlindness = computed({
  get(): boolean {
    return settingsStore.colorblind
  },
  set(value: boolean): void {
    settingsStore.setColorblind(value, true)
  },
})
</script>

<style scoped>
.audioSwitchSlider {
  display: flex;
  align-items: center;
  justify-content: center;
}

.positionContainer {
  display: flex;
  gap: 2px;
  flex-direction: column;
  align-items: flex-start;
}

.positionCheckBox {
  margin: 0px 10px 0px 0px;
}
</style>
