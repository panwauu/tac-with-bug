<template>
  <div>
    <Button
      icon="pi pi-eye"
      severity="info"
      rounded
      :label="buttonLabel"
      :disabled="nWatching === 0"
      @click="toggle"
    />
    <Popover
      ref="watchingPlayersRef"
      append-to="body"
      :show-close-icon="true"
    >
      <div style="max-height: 300px; overflow-y: auto">
        <PlayerWithPicture
          v-for="player in watchingPlayers"
          :key="`watchingPlayers-${player}`"
          :username="player"
          :clickable="false"
          :name-first="false"
          style="margin: 5px 25px 5px 5px"
        />
        <div v-if="watchingPlayers.length === 0 && nWatching === 0">{{ t('Game.WatchingPlayers.nooneWatching') }}</div>
        <div v-if="nWatching - watchingPlayers.length > 0">
          {{ t('Game.WatchingPlayers.anonymousWatching', { count: nWatching - watchingPlayers.length, n: nWatching - watchingPlayers.length }) }}
        </div>
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import PlayerWithPicture from '../PlayerWithPicture.vue'

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{ displayText: boolean; nWatching: number; watchingPlayers: string[] }>()

const watchingPlayersRef = ref<Popover | null>(null)
function toggle(event: any) {
  watchingPlayersRef.value?.toggle(event)
}

const buttonLabel = computed(() => {
  if (props.displayText) {
    return t('Game.WatchingPlayers.buttonLabel', { count: props.nWatching, n: props.nWatching })
  }
  return props.nWatching.toString()
})
</script>
