<template>
  <div>
    <template v-if="game != null">
      <WaitingGame
        :game="game"
        :active="true"
        @move-player="movePlayer"
        @remove-player="removePlayer"
        @ready-player="setPlayerReady"
        @color-player="setPlayerColor"
      />
    </template>
    <template v-else>
      <CountdownTimer
        v-if="miscState.rematch_open"
        :initialMilliseconds="miscState.lastPlayed + 1000 * 60 * 3 - Date.now()"
        :mode="'down'"
        :displayDays="false"
      />
      <div style="padding-bottom: 15px">{{ $t("Game.Rematch.description") }}</div>
      <p v-if="!miscState.rematch_open">{{ $t("Game.Rematch.rematchNotAllowed") }}</p>
      <Button
        :disabled="!miscState.rematch_open"
        :label="$t('Game.Rematch.startButton')"
        @click="createRematch()"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import WaitingGame from '@/components/WaitingGame.vue';
import CountdownTimer from '../CountdownTimer.vue';

import type { positionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { miscStateType } from '@/services/compositionGame/useMisc'
import { computed, onUnmounted } from 'vue';
import { i18n } from '@/services/i18n'
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import router from '@/router/index'
import { injectStrict, SocketKey } from '@/services/injections'
import { useWaitingStore } from '@/store/waiting'

const waitingStore = useWaitingStore()

defineEmits(['closeGame', 'update:modalVisible', 'update:modalState'])
const socket = injectStrict(SocketKey);

const props = defineProps<{
  positionStyles: positionStylesState,
  miscState: miscStateType,
}>();

socket.on('waiting:startGame', (data) => {
  router.push({ name: 'Game', query: data });
  setTimeout(() => { router.go(0) }, 200);
});

onUnmounted(() => {
  socket.removeAllListeners('waiting:startGame');
})

const game = computed(() => {
  if (waitingStore.ownGame?.gameid === props.miscState.gameID) { return waitingStore.ownGame }
  return waitingStore.games.find((g) => g.gameid === props.miscState.gameID)
})

async function createRematch() {
  const res = await socket.emitWithAck(5000, 'waiting:createRematch', { gameID: props.miscState.gameID })
  if (res.ok) { return }

  let summary = i18n.global.t('Game.Rematch.errorGeneralSummary')
  let detail = i18n.global.t('Game.Rematch.errorGeneralDetail')
  switch (res.error) {
    case 'PLAYER_ALREADY_IN_WAITING_GAME':
      summary = i18n.global.t('Game.Rematch.errorAlreadyInWaitingSummary')
      detail = i18n.global.t('Game.Rematch.errorAlreadyInWaitingDetail')
      break;
    case 'PLAYER_NOT_ONLINE':
      summary = i18n.global.t('Game.Rematch.errorNotOnlineSummary')
      detail = i18n.global.t('Game.Rematch.errorNotOnlineDetail')
      break;
  }

  toast.add({ severity: 'error', summary, detail, life: 5000 })
}

function movePlayer(data: { gameID: number, username: string, steps: number }) {
  socket.emit('waiting:movePlayer', data);
}

function removePlayer(username: string) {
  if (confirm(i18n.global.t('Waiting.leaveRematch'))) {
    socket.emit('waiting:removePlayer', username);
  }
}

function setPlayerReady(gameID: number) {
  socket.emit('waiting:readyPlayer', { gameID: gameID });
}

function setPlayerColor(username: string, gameID: number, color: string) {
  socket.emit('waiting:switchColor', { gameID: gameID, username: username, color: color });
}
</script>

<style scoped>
</style>
