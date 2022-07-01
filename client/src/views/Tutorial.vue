<template>
  <div style="width: 100%; height: 100%">
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
      :updateData="tutorialStepOutput?.updateData ?? null"
      @closeGame="closeGame()"
    />
    <GameTutorial
      :tutorialStepOutput="tutorialStepOutput"
      :loading="loading"
      :display="displayTutorialOverlay"
      :tutorialID="tutorialID"
      :tutorialStep="tutorialStep"
      @goForward="moveStep(1)"
      @goBackward="moveStep(-1)"
      @closeOverlay="displayTutorialOverlay = false"
      @openOverlay="displayTutorialOverlay = true"
      @quizEnded="tutorialStore.changeTutorialStepValue(socket, tutorialID, tutorialStep, true)"
      @reset="resetStep"
    />
  </div>
</template>

<script setup lang="ts">
import GameTutorial from '@/components/game/GameTutorial.vue';
import GameComponent from '@/components/game/GameComponent.vue';

import type { performMoveAction } from '@/services/compositionGame/usePerformMove';
import { ref, computed, watch } from 'vue';
import { isEqual } from 'lodash';
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles';
import { useMisc } from '@/services/compositionGame/useMisc';
import { useStatistic } from '@/services/compositionGame/useStatistic';
import { useBalls } from '@/services/compositionGame/useBalls';
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile';
import { usePerformMove } from '@/services/compositionGame/usePerformMove';
import { useCards } from '@/services/compositionGame/useCards';
import { useInstructions } from '@/services/compositionGame/useInstructions';
import router from '@/router/index';
import { useTutorialStore } from '@/store/tutorial';
const tutorialStore = useTutorialStore()

import { injectStrict, SocketKey } from '@/services/injections';
import { TutorialStepOutput } from '@/../../shared/types/typesTutorial';
const socket = injectStrict(SocketKey);

const tutorialProgress = computed(() => { return tutorialStore.getProgress[tutorialID.value] })

let miscState = useMisc(4);
let positionStyles = usePositionStyles(miscState);
let statisticState = useStatistic();
let discardPileState = useDiscardPile(miscState.gamePlayer);
let ballsState = useBalls();
let cardsState = useCards(ballsState, miscState);
let performMove = usePerformMove(cardsState, ballsState, miscState, discardPileState);
let instructionsState = useInstructions(miscState, ballsState, cardsState);

let modalVisible = ref(false)
let modalState = ref('statistic')
let loading = ref(true)
let tutorialStepOutput = ref<null | TutorialStepOutput>(null)
let displayTutorialOverlay = ref(true)
let tutorialID = ref(0)
let tutorialStep = ref(0)

tutorialID.value = parseInt(router.currentRoute.value.query.tutorialID as string);
tutorialStep.value = parseInt(router.currentRoute.value.query.tutorialStep as string);

function closeGame() {
  if (tutorialStepOutput?.value?.goal?.closeButton != null) {
    tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, true)
    router.push({ name: 'Landing' });
  } else {
    displayTutorialOverlay.value = true;
  }
}

function moveStep(n: number) {
  tutorialStep.value = tutorialStep.value + n;
  router.replace({
    name: 'Tutorial',
    query: {
      tutorialID: router.currentRoute.value.query.tutorialID,
      tutorialStep: tutorialStep.value.toString(),
    },
  });
  loadStep()
}

loadStep();

async function loadStep() {
  loading.value = true;
  const res = await socket.emitWithAck(5000, 'tutorial:load', { tutorialID: tutorialID.value, tutorialStep: tutorialStep.value })
  if (res.status !== 200 || res.data == null) { router.push({ name: 'TutorialOverview' }); return }

  tutorialStepOutput.value = res.data;

  if (tutorialStepOutput.value?.goal?.quiz != null) {
    tutorialStepOutput.value.goal.quiz.order = [
      ...Array(tutorialStepOutput.value?.goal?.quiz.nSolutions).keys(),
    ].sort(() => 0.5 - Math.random());
  }

  displayTutorialOverlay.value = true;
  cardsState.resetSelectedCard();
  if (res.data?.config?.selectedCard != null) {
    const cardIndex = res.data?.config?.selectedCard
    setTimeout(() => {
      if (cardIndex >= 0) {
        cardsState.resetSelectedCard();
        cardsState.setSelectedCard(parseInt(cardsState.cards[cardIndex].key))
      }
      else { cardsState.resetSelectedCard(); }
    }, 50);
  }

  if (tutorialStepOutput.value?.goal == null) {
    tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, true)
  }

  loading.value = false;
}

async function performMoveAndEmit(performMoveAction: performMoveAction) {
  if (tutorialStepOutput.value == null) { return }

  let move = performMove(performMoveAction);
  const res = await socket.emitWithAck(5000, 'tutorial:postMove', { game: tutorialStepOutput.value.game, move })
  if (res.status !== 200 || res.data == null) { router.push({ name: 'TutorialOverview' }); return }
  if (tutorialStepOutput.value != null) {
    tutorialStepOutput.value.game = res.data.game
    tutorialStepOutput.value.updateData = res.data.updateData
  }
}

function watcherDone() {
  if (
    loading.value ||
    tutorialProgress.value[tutorialStep.value] ||
    displayTutorialOverlay.value
  ) {
    return;
  }
  let done = checkDone();
  displayTutorialOverlay.value = done ? true : false;
  tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, done)
}

function checkDone() {
  let goal = tutorialStepOutput.value?.goal;

  if (goal?.modalState != null && (modalVisible.value || goal?.modalState !== modalState.value)) {
    return false;
  }

  if (goal?.selectedCard != null && cardsState.selectedCard !== goal?.selectedCard) {
    return false;
  }

  if (goal?.balls != null && !matchAnyArrayOfObject(ballsState.balls, goal.balls)) {
    return false;
  }

  if (goal?.aussetzenFlag != null && goal?.aussetzenFlag !== miscState.aussetzenFlag) {
    return false;
  }

  if (goal?.quiz != null || goal?.closeButton != null) {
    return false;
  }

  return true;
}

async function resetStep() {
  loading.value = true;
  await tutorialStore.changeTutorialStepValue(socket, tutorialID.value, tutorialStep.value, false)
  await loadStep()
}

const computedForWatch = computed(() => {
  return [modalVisible.value, modalState.value, cardsState, ballsState];
})
watch(computedForWatch, () => watcherDone(), { deep: true })

function matchAnyArrayOfObject(curr: Array<any>, goal: any[][]) {
  for (let g = 0; g < goal.length; g++) {
    if (isEqual(curr, goal[g])) { return true }
  }
  return false
}
</script>
