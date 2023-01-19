<template>
  <Button
    v-if="!display"
    icon="pi pi-info"
    :label="$t('Tutorial.openTutorial')"
    style="position: absolute; left: 5px; bottom: 5px"
    @click="$emit('openOverlay')"
  />
  <div
    v-if="display"
    class="tutorialOverlay"
  >
    <Button
      icon="pi pi-undo"
      :label="$t('Tutorial.stopTutorial')"
      style="position: absolute; left: 5px; top: 5px"
      @click="abortTutorial"
    />
    <div class="tutorialControls p-card">
      <Button
        icon="pi pi-angle-left"
        class="p-button tutorialControlsButton"
        :disabled="!canGoBackward || loading"
        @click="goBackward()"
      />
      <div style="padding: 20px; flex-grow: 1">
        <ProgressBar
          :value="progress * 100"
          :showValue="false"
          style="margin: 15px; height: 0.5rem"
        />

        <div
          v-if="loading"
          class="p-card-header"
        >
          <Skeleton style="width: 50%; height: 2rem; margin: 0 auto" />
        </div>
        <div
          v-if="loading"
          class="p-card-content"
        >
          <Skeleton style="width: 100%; height: 10rem" />
        </div>

        <div
          v-if="!loading"
          class="p-card-header"
          style="display: flex; align-items: center"
        >
          <h3
            v-if="!loading"
            style="flex: 1 1 auto; margin: 5px"
          >
            {{ $t(`Tutorial.${tutorialID}.title`) }}
          </h3>
        </div>
        <div
          v-if="!loading"
          class="p-card-content"
        >
          <Message
            v-if="quizError"
            severity="error"
            :closable="false"
          >
            {{ $t('Tutorial.quizWrongAnswer') }}
          </Message>
          <Message
            v-if="done && tutorialStepOutput?.goal != null"
            severity="success"
            :closable="false"
          >
            {{ $t(`Tutorial.Encouragement.${Math.floor(Math.random() * 10)} `) }}
            {{ $t(`Tutorial.nextQuestion`) }}
          </Message>
          <template v-else>
            {{ $t(`Tutorial.${tutorialID}.${tutorialStep}.detail`) }}
            <div
              v-if="tutorialStepOutput?.goal?.quiz != null"
              class="quizcontainer"
            >
              <div
                v-for="i in [...Array(tutorialStepOutput?.goal?.quiz.nSolutions).keys()]"
                :key="`Quizquestion - ${String(i)} `"
                class="p-field-radiobutton"
                style="margin: 5px"
              >
                <RadioButton
                  :id="`radio - ${String(i)} `"
                  v-model="quizSelected"
                  name="quiz"
                  :value="tutorialStepOutput?.goal?.quiz?.order?.[i]"
                />
                <label
                  :for="`radio - ${String(i)} `"
                  style="margin-left: 10px"
                >
                  {{ $t(`Tutorial.${tutorialID}.${tutorialStep}.answer - ${tutorialStepOutput?.goal?.quiz?.order?.[i]}`) }}
                </label>
              </div>
            </div>
          </template>
        </div>
        <div
          v-if="!loading"
          class="p-card-footer buttonContainer"
        >
          <Button
            v-if="reset"
            icon="pi pi-undo"
            :label="$t('Tutorial.resetButton')"
            style="margin: 10px"
            @click="$emit('reset')"
          />
          <Button
            v-if="toGame"
            :disabled="done"
            icon="pi pi-play"
            :label="$t('Tutorial.toGameButton')"
            style="margin: 10px"
            @click="$emit('closeOverlay')"
          />
          <Button
            v-if="tutorialStepOutput?.goal?.quiz != null"
            :disabled="done || quizSelected === null"
            icon="pi pi-play"
            :label="$t('Tutorial.quizSubmitButton')"
            style="margin: 10px"
            @click="answerQuiz()"
          />
        </div>
      </div>
      <Button
        icon="pi pi-angle-right"
        class="p-button tutorialControlsButton"
        :disabled="!done || loading || tutorialStep + 1 >= tutorialStore.getProgress[tutorialID].length"
        @click="goForward()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import RadioButton from 'primevue/radiobutton'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'

import { ref, computed } from 'vue'
import router from '@/router/index'
import type { TutorialStepOutput } from '@/../../server/src/sharedTypes/typesTutorial'

import { useTutorialStore } from '@/store/tutorial'
const tutorialStore = useTutorialStore()

const emit = defineEmits(['goForward', 'goBackward', 'closeOverlay', 'openOverlay', 'quizEnded', 'reset'])

const props = defineProps<{
  tutorialStepOutput: TutorialStepOutput | null
  loading: boolean
  display: boolean
  tutorialID: number
  tutorialStep: number
}>()

const quizSelected = ref(null)
const quizError = ref(false)

function abortTutorial() {
  router.push({ name: 'TutorialOverview' })
}

function answerQuiz() {
  if (quizSelected.value === 0) {
    emit('quizEnded')
    quizError.value = false
    quizSelected.value = null
  } else {
    quizError.value = true
  }
}

function resetQuiz() {
  quizError.value = false
  quizSelected.value = null
}

function goForward() {
  resetQuiz()
  emit('goForward')
}

function goBackward() {
  resetQuiz()
  emit('goBackward')
}

const toGame = computed(() => {
  return props.tutorialStepOutput?.goal === null ? false : true
})

const reset = computed(() => {
  return props.tutorialStepOutput?.goal?.balls != null ||
    //props.tutorialStepOutput?.goal?.cards != null ||
    props.tutorialStepOutput?.goal?.selectedCard != null //||
    ? //props.tutorialStepOutput?.goal?.selectedBall != null
      true
    : false
})

const canGoBackward = computed(() => {
  return parseInt(router.currentRoute.value.query?.step as string) !== 0
})

const done = computed(() => {
  return tutorialStore.getProgress?.[props.tutorialID]?.[props.tutorialStep] ?? false
})

const progress = computed(() => {
  return Math.min(1, Math.max(0, props.tutorialStep / (tutorialStore.getProgress[props.tutorialID]?.length - 1 ?? Infinity)))
})
</script>

<style scoped>
.tutorialOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #c9c9c9a0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.tutorialControls {
  display: flex;
  justify-content: center;
  flex: 0 1 600px;
}

.tutorialControlsButton {
  flex-shrink: 0;
}

.buttonContainer {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
}

.quizcontainer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 20px;
}
</style>
