<template>
  <div>
    <template v-if="game != null">
      <WaitingGame
        :game="game"
        :active="true"
        @add-bot="addBot"
        @move-player="movePlayer"
        @move-bot="moveBot"
        @remove-player="removePlayer"
        @remove-bot="removeBot"
        @ready-player="setPlayerReady"
        @color-player="setPlayerColor"
      />
    </template>
    <template v-else>
      <CountdownTimer
        v-if="miscState.rematch_open"
        :initialMilliseconds="miscState.lastPlayed + 1000 * 60 * 3 - Date.now()"
        :mode="'down'"
        largestUnit="hours"
      />
      <div style="padding-bottom: 15px">{{ t('Game.Rematch.description') }}</div>
      <p v-if="!miscState.rematch_open">{{ t('Game.Rematch.rematchNotAllowed') }}</p>
      <Button
        :disabled="!miscState.rematch_open"
        :label="t('Game.Rematch.startButton')"
        @click="createRematch()"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import WaitingGame from '@/components/WaitingGame.vue'
import CountdownTimer from '../CountdownTimer.vue'

import type { PositionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { MiscStateType } from '@/services/compositionGame/useMisc'
import { computed, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import router from '@/router/index'
import { injectStrict, SocketKey } from '@/services/injections'
import { useWaitingStore } from '@/store/waiting'

const toast = useToast()
const waitingStore = useWaitingStore()

defineEmits<{ closeGame: []; 'update:modalVisible': []; 'update:modalState': [] }>()
const socket = injectStrict(SocketKey)

const props = defineProps<{
  positionStyles: PositionStylesState
  miscState: MiscStateType
}>()

socket.on('waiting:startGame', (data) => {
  router.push({ name: 'Game', query: data })
  setTimeout(() => {
    router.go(0)
  }, 200)
})

onUnmounted(() => {
  socket.removeAllListeners('waiting:startGame')
})

const game = computed(() => {
  if (waitingStore.ownGame?.gameid === props.miscState.gameID) {
    return waitingStore.ownGame
  }
  return waitingStore.games.find((g) => g.gameid === props.miscState.gameID)
})

async function createRematch() {
  const res = await socket.emitWithAck(5000, 'waiting:createRematch', { gameID: props.miscState.gameID })
  if (res.ok) {
    return
  }

  let summary = t('Game.Rematch.errorGeneralSummary')
  let detail = t('Game.Rematch.errorGeneralDetail')
  switch (res.error) {
    case 'PLAYER_ALREADY_IN_WAITING_GAME':
      summary = t('Game.Rematch.errorAlreadyInWaitingSummary')
      detail = t('Game.Rematch.errorAlreadyInWaitingDetail')
      break
    case 'PLAYER_NOT_ONLINE':
      summary = t('Game.Rematch.errorNotOnlineSummary')
      detail = t('Game.Rematch.errorNotOnlineDetail')
      break
  }

  toast.add({ severity: 'error', summary, detail, life: 5000 })
}

function addBot(data: { gameID: number; botID: number; playerIndex: number }) {
  socket.emitWithAck(5000, 'waiting:addBot', data.gameID, data.botID, data.playerIndex)
}

function movePlayer(data: { gameID: number; username: string; steps: number }) {
  socket.emitWithAck(5000, 'waiting:movePlayer', data)
}

function moveBot(data: { gameID: number; playerIndex: number; steps: number }) {
  socket.emitWithAck(5000, 'waiting:moveBot', data)
}

function removePlayer(username: string) {
  if (confirm(t('Waiting.leaveRematch'))) {
    socket.emitWithAck(5000, 'waiting:removePlayer', username)
  }
}

function removeBot(data: { gameID: number; playerIndex: number }) {
  socket.emitWithAck(5000, 'waiting:removeBot', data.gameID, data.playerIndex)
}

function setPlayerReady(gameID: number) {
  socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: gameID })
}

function setPlayerColor(usernameToChange: string, gameID: number, color: string, botIndex: number | null) {
  socket.emitWithAck(5000, 'waiting:switchColor', {
    gameID,
    username: usernameToChange,
    color,
    botIndex,
  })
}
</script>
