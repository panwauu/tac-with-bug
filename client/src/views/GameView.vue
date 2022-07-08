<template>
  <GameComponent
    v-model:modalVisible="modalVisible"
    v-model:modalState="modalState"
    :positionStyles="positionStyles"
    :miscState="miscState"
    :statisticState="statisticState"
    :discardPileState="discardPileState"
    :ballsState="ballsState"
    :performMove="performMoveAndEmit"
    :cardsState="cardsState"
    :instructionsState="instructionsState"
    :updateData="updateData"
    @closeGame="closeGame()"
  />
</template>

<script setup lang="ts">
import GameComponent from '@/components/game/GameComponent.vue'

import type { UpdateDataType } from '@/../../server/src/sharedTypes/typesDBgame'
import { ref, onMounted, onUnmounted } from 'vue'
import { registerGameSocket } from '@/services/registerSockets'
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles'
import { useMisc } from '@/services/compositionGame/useMisc'
import { useStatistic } from '@/services/compositionGame/useStatistic'
import { useBalls } from '@/services/compositionGame/useBalls'
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile'
import { PerformMoveAction, usePerformMove } from '@/services/compositionGame/usePerformMove'
import { useCards } from '@/services/compositionGame/useCards'
import { useInstructions } from '@/services/compositionGame/useInstructions'
import { sound } from '@/plugins/sound'
import { audioHandler } from '@/services/compositionGame/audioHandler'
import router from '@/router/index'

const gameSocket = registerGameSocket()
const miscState = useMisc()
const positionStyles = usePositionStyles(miscState)
const statisticState = useStatistic()
const discardPileState = useDiscardPile(miscState.gamePlayer)
const ballsState = useBalls()
const cardsState = useCards(ballsState, miscState)
const performMove = usePerformMove(cardsState, ballsState, miscState, discardPileState)
const instructionsState = useInstructions(miscState, ballsState, cardsState)
const updateData = ref<null | UpdateDataType>(null)

const modalVisible = ref(false)
const modalState = ref('settings')

gameSocket.on('game:online-players', miscState.setOnlinePlayers)
gameSocket.on('update', updateHandler)
gameSocket.on('reconnect_failed', closeGame)

onMounted(() => {
  positionStyles.onResize()
  setTimeout(() => {
    positionStyles.onResize()
  }, 100)
})

onUnmounted(() => {
  gameSocket.off('game:online-players', miscState.setOnlinePlayers)
  gameSocket.off('update', updateHandler)
  gameSocket.off('reconnect_failed', closeGame)
  gameSocket.disconnect()
  sound.$stop()
})

async function updateHandler(data: UpdateDataType): Promise<void> {
  audioHandler(data, cardsState, miscState)
  updateData.value = data
}

function closeGame() {
  router.push({ name: 'Landing' })
}

function performMoveAndEmit(data: PerformMoveAction) {
  gameSocket.emit('postMove', performMove(data))
}
</script>
