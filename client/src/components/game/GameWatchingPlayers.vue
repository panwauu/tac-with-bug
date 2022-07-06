<template>
  <div>
    <Button
      icon="pi pi-eye"
      class="p-button-rounded p-button-info"
      :label="buttonLabel"
      :disabled="nWatching === 0"
      @click="toggle"
    />
    <OverlayPanel
      ref="watchingPlayersRef"
      appendTo="body"
      :showCloseIcon="true"
    >
      <div style="max-height: 300px; overflow-y: auto">
        <PlayerWithPicture
          v-for="player in watchingPlayers"
          :key="`watchingPlayers-${player}`"
          :username="player"
          :clickable="false"
          :nameFirst="false"
          style="margin: 5px 25px 5px 5px"
        />
        <div v-if="watchingPlayers.length === 0 && nWatching === 0">{{ $t('Game.WatchingPlayers.nooneWatching') }}</div>
        <div v-if="nWatching - watchingPlayers.length > 0">
          {{ $tc('Game.WatchingPlayers.anonymousWatching', nWatching - watchingPlayers.length, { n: nWatching - watchingPlayers.length }) }}
        </div>
      </div>
    </OverlayPanel>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import OverlayPanel from 'primevue/overlaypanel'
import PlayerWithPicture from '../PlayerWithPicture.vue'

import { ref, computed } from 'vue'
import { i18n } from '@/services/i18n'

const props = defineProps<{ displayText: boolean; nWatching: number; watchingPlayers: string[] }>()

const watchingPlayersRef = ref<OverlayPanel | null>(null)
function toggle(event: any) {
  watchingPlayersRef.value?.toggle(event)
}

const buttonLabel = computed(() => {
  if (props.displayText) {
    return (i18n.global as any).tc('Game.WatchingPlayers.buttonLabel', props.nWatching, { n: props.nWatching })
  }
  return props.nWatching.toString()
})
</script>

<style scoped></style>
