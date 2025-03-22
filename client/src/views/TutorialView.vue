<template>
  <div style="width: 100%; height: 100%">
    <GameComponent
      v-model:modal-visible="modalVisible"
      v-model:modal-state="modalState"
      :position-styles="positionStyles"
      :misc-state="miscState"
      :discard-pile-state="discardPileState"
      :balls-state="ballsState"
      :perform-move="performMoveAndEmit"
      :cards-state="cardsState"
      :instructions-state="instructionsState"
      :update-data="tutorialStepOutput?.updateData ?? null"
      @close-game="closeGame()"
    />
    <GameTutorial
      :tutorial-step-output="tutorialStepOutput"
      :loading="loading"
      :display="displayTutorialOverlay"
      :tutorial-i-d="tutorialID"
      :tutorial-step="tutorialStep"
      @go-forward="moveStep(1)"
      @go-backward="moveStep(-1)"
      @close-overlay="displayTutorialOverlay = false"
      @open-overlay="displayTutorialOverlay = true"
      @quiz-ended="tutorialStore.changeTutorialStepValue(socket, tutorialID, tutorialStep, true)"
      @reset="resetStep"
    />
  </div>
</template>

<script setup lang="ts">
import GameTutorial from '@/components/game/GameTutorial.vue'
import GameComponent from '@/components/game/GameComponent.vue'

import { usePerformMove, type PerformMoveAction } from '@/services/compositionGame/usePerformMove'
import { ref, computed, watch } from 'vue'
import { isEqual } from 'lodash'
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles'
import { useMisc } from '@/services/compositionGame/useMisc'
import { useBalls } from '@/services/compositionGame/useBalls'
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile'
import { useCards } from '@/services/compositionGame/useCards'
import { useInstructions } from '@/services/compositionGame/useInstructions'
import router from '@/router/index'
import { useTutorialStore } from '@/store/tutorial'
import { injectStrict, SocketKey } from '@/services/injections'
import type { TutorialStepOutput } from '@/../../server/src/sharedTypes/typesTutorial'

const tutorialStore = useTutorialStore()
const socket = injectStrict(SocketKey)

const tutorialProgress = computed(() => {
  return tutorialStore.getProgress[tutorialID.value]
})

const miscState = useMisc(4)
const positionStyles = usePositionStyles(miscState)
const discardPileState = useDiscardPile(miscState.gamePlayer)
const ballsState = useBalls()
const cardsState = useCards(ballsState, miscState)
const performMove = usePerformMove(cardsState, ballsState, miscState, discardPileState)
const instructionsState = useInstructions(miscState, ballsState, cardsState)

const modalVisible = ref(false)
const modalState = ref('statistic')
const loading = ref(true)
const tutorialStepOutput = ref<null | TutorialStepOutput>(null)
const displayTutorialOverlay = ref(true)
const tutorialID = ref(parseInt(router.currentRoute.value.query.tutorialID as string))
const tutorialStep = ref(parseInt(router.currentRoute.value.query.tutorialStep as string))

function closeGame() {
  if (tutorialStepOutput?.value?.goal?.closeButton != null) {
    tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, true)
    router.push({ name: 'Landing' })
  } else {
    displayTutorialOverlay.value = true
  }
}

function moveStep(n: number) {
  tutorialStep.value = tutorialStep.value + n
  router.replace({
    name: 'Tutorial',
    query: {
      tutorialID: router.currentRoute.value.query.tutorialID,
      tutorialStep: tutorialStep.value.toString(),
    },
  })
  loadStep()
}

loadStep()

async function loadStep() {
  loading.value = true
  console.log(tutorialID.value, tutorialStep.value)
  const res = await socket.emitWithAck(5000, 'tutorial:load', { tutorialID: tutorialID.value, tutorialStep: tutorialStep.value })
  console.log(res)
  if (res.status !== 200 || res.data == null) {
    router.push({ name: 'TutorialOverview' })
    return
  }

  tutorialStepOutput.value = res.data

  if (tutorialStepOutput.value?.goal?.quiz != null) {
    tutorialStepOutput.value.goal.quiz.order = [...Array(tutorialStepOutput.value?.goal?.quiz.nSolutions).keys()].sort(() => 0.5 - Math.random())
  }

  displayTutorialOverlay.value = true
  cardsState.resetSelectedCard()
  if (res.data?.config?.selectedCard != null) {
    const cardIndex = res.data?.config?.selectedCard
    setTimeout(() => {
      if (cardIndex >= 0) {
        cardsState.resetSelectedCard()
        cardsState.setSelectedCard(parseInt(cardsState.cards[cardIndex].key))
      } else {
        cardsState.resetSelectedCard()
      }
    }, 50)
  }

  if (tutorialStepOutput.value?.goal == null) {
    tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, true)
  }

  loading.value = false
}

async function performMoveAndEmit(performMoveAction: PerformMoveAction) {
  if (tutorialStepOutput.value == null) {
    return
  }

  const move = performMove(performMoveAction)
  const res = await socket.emitWithAck(5000, 'tutorial:postMove', { game: tutorialStepOutput.value.game, move })
  if (res.status !== 200 || res.data == null) {
    router.push({ name: 'TutorialOverview' })
    return
  }

  if (tutorialStepOutput.value != null) {
    tutorialStepOutput.value.game = res.data.game
    tutorialStepOutput.value.updateData = res.data.updateData
  }
}

function watcherDone() {
  if (loading.value || tutorialProgress?.value?.[tutorialStep.value] || displayTutorialOverlay?.value) {
    return
  }
  const done = checkDone()
  displayTutorialOverlay.value = done ? true : false
  tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, done)
}

function checkDone() {
  const goal = tutorialStepOutput.value?.goal

  return (
    !(goal?.modalState != null && (modalVisible.value || goal?.modalState !== modalState.value)) &&
    !(goal?.selectedCard != null && cardsState.selectedCard !== goal?.selectedCard) &&
    !(goal?.selectedCard != null && cardsState.selectedCard !== goal?.selectedCard) &&
    !(goal?.balls != null && !matchAnyArrayOfObject(ballsState.balls, goal.balls)) &&
    !(goal?.aussetzenFlag != null && goal?.aussetzenFlag !== miscState.aussetzenFlag) &&
    !(goal?.quiz != null || goal?.closeButton != null)
  )
}

async function resetStep() {
  loading.value = true
  await tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, false)
  await loadStep()
}

const computedForWatch = computed(() => {
  return [modalVisible.value, modalState.value, cardsState, ballsState]
})
watch(computedForWatch, () => watcherDone(), { deep: true })

function matchAnyArrayOfObject(curr: Array<any>, goal: any[][]) {
  for (const goalentry of goal) {
    if (isEqual(curr, goalentry)) {
      return true
    }
  }
  return false
}
</script>
