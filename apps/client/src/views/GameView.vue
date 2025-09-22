<template>
  <GameComponent
    v-model:modal-visible="modalVisible"
    v-model:modal-state="modalState"
    :position-styles="positionStyles"
    :misc-state="miscState"
    :statistic-state="statisticState"
    :discard-pile-state="discardPileState"
    :balls-state="ballsState"
    :perform-move="performMoveAndEmit"
    :cards-state="cardsState"
    :instructions-state="instructionsState"
    :update-data="updateData"
    @close-game="closeGame()"
  />
</template>

<script setup lang="ts">
import GameComponent from '@/components/game/GameComponent.vue'
import type { UpdateDataType } from 'tac-core/types/typesDBgame'
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { registerGameSocket } from '@/services/registerSockets'
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles'
import { useMisc } from '@/services/compositionGame/useMisc'
import { useStatistic } from '@/services/compositionGame/useStatistic'
import { useBalls } from '@/services/compositionGame/useBalls'
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile'
import { type PerformMoveAction, usePerformMove } from '@/services/compositionGame/usePerformMove'
import { useCards } from '@/services/compositionGame/useCards'
import { useInstructions } from '@/services/compositionGame/useInstructions'
import { sound } from '@/plugins/sound'
import { audioHandler } from '@/services/compositionGame/audioHandler'
import router from '@/router/index'
import { GameSocketKey } from '@/services/injections'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToast()
const gameSocket = registerGameSocket()
provide(GameSocketKey, gameSocket)
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
gameSocket.on('disconnect', closeGame)
gameSocket.on('toast:substitution-started', substitutionOfferToast)
gameSocket.on('toast:substitution-done', substitutionDoneToast)
gameSocket.on('toast:substitution-stopped', substitutionStoppedToast)

function substitutionOfferToast(username: string, usernameToSubstitute: string) {
  toast.add({
    severity: 'warn',
    life: 5000,
    summary: t('Game.Toast.substitution-offer-summary'),
    detail: t('Game.Toast.substitution-offer-detail', { username, usernameToSubstitute }),
  })
}

function substitutionDoneToast(username: string, replacedUsername: string) {
  toast.add({
    severity: 'success',
    life: 5000,
    summary: t('Game.Toast.substitution-done-summary'),
    detail: t('Game.Toast.substitution-done-detail', { username, replacedUsername }),
  })
}

function substitutionStoppedToast() {
  toast.add({
    severity: 'error',
    life: 5000,
    summary: t('Game.Toast.substitution-stopped-summary'),
    detail: t('Game.Toast.substitution-stopped-detail'),
  })
}

onMounted(() => {
  positionStyles.onResize()
  setTimeout(() => {
    positionStyles.onResize()
  }, 100)
})

let substitutionTimeout: number
function updateSubstitutionTimeout(updateDataParam: UpdateDataType) {
  clearTimeout(substitutionTimeout)

  if (updateDataParam.gameEnded) return

  const timeout = updateDataParam.lastPlayed + 60 * 1000 - Date.now()
  if (timeout < 0) return

  substitutionTimeout = window.setTimeout(() => {
    toast.add({
      severity: 'warn',
      life: 10000,
      summary: t('Game.Toast.substitution-possible-summary'),
      detail: t('Game.Toast.substitution-possible-detail'),
    })
  }, timeout)
}

onUnmounted(() => {
  clearTimeout(substitutionTimeout)
  gameSocket.off('game:online-players', miscState.setOnlinePlayers)
  gameSocket.off('update', updateHandler)
  gameSocket.off('reconnect_failed', closeGame)
  gameSocket.off('disconnect', closeGame)
  gameSocket.off('toast:substitution-started', substitutionOfferToast)
  gameSocket.off('toast:substitution-done', substitutionDoneToast)
  gameSocket.off('toast:substitution-stopped', substitutionStoppedToast)
  gameSocket.disconnect()
  sound.$stop()
})

async function updateHandler(data: UpdateDataType): Promise<void> {
  audioHandler(data, cardsState, miscState)
  updateSubstitutionTimeout(data)
  updateData.value = data
}

function closeGame() {
  router.push({ name: 'Landing' })
}

function performMoveAndEmit(data: PerformMoveAction) {
  gameSocket.emit('postMove', performMove(data))
}
</script>
