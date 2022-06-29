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
import GameComponent from '@/components/game/GameComponent.vue';

import type { updateDataType } from '@/../../shared/types/typesDBgame'
import { ref, onMounted, onUnmounted } from 'vue';
import { registerGameSocket } from '@/services/registerSockets';
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles';
import { useMisc } from '@/services/compositionGame/useMisc';
import { useStatistic } from '@/services/compositionGame/useStatistic';
import { useBalls } from '@/services/compositionGame/useBalls';
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile';
import { performMoveAction, usePerformMove } from '@/services/compositionGame/usePerformMove';
import { useCards } from '@/services/compositionGame/useCards';
import { useInstructions } from '@/services/compositionGame/useInstructions';
import { sound } from '@/plugins/sound';
import { audioHandler } from '@/services/compositionGame/audioHandler';
import router from '@/router/index';

let gameSocket = registerGameSocket();
let miscState = useMisc();
let positionStyles = usePositionStyles(miscState);
let statisticState = useStatistic();
let discardPileState = useDiscardPile(miscState.gamePlayer);
let ballsState = useBalls();
let cardsState = useCards(ballsState, miscState);
let performMove = usePerformMove(cardsState, ballsState, miscState, discardPileState);
let instructionsState = useInstructions(miscState, ballsState, cardsState);
let updateData = ref<null | updateDataType>(null)

let modalVisible = ref(false)
let modalState = ref('settings')

gameSocket.on('game:online-players', miscState.setOnlinePlayers);
gameSocket.on('update', updateHandler);
gameSocket.on('reconnect_failed', closeGame);

onMounted(() => {
  positionStyles.onResize();
  setTimeout(() => { positionStyles.onResize() }, 100);
})

onUnmounted(() => {
  gameSocket.off('game:online-players', miscState.setOnlinePlayers);
  gameSocket.off('update', updateHandler);
  gameSocket.off('reconnect_failed', closeGame);
  gameSocket.disconnect();
  sound.$stop();
})


async function updateHandler(data: updateDataType): Promise<void> {
  audioHandler(data, cardsState, miscState)
  updateData.value = data
}

function closeGame() {
  router.push({ name: 'Landing' });
}

function performMoveAndEmit(data: performMoveAction) {
  gameSocket.emit('postMove', performMove(data));
}
</script>

<style scoped>
</style>
