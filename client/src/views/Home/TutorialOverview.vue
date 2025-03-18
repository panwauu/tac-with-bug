<template>
  <div class="p-card tutorialPage">
    <h2>{{ t('Tutorial.tutorialHeader') }}</h2>
    <div style="margin-bottom: 15px">{{ t('Tutorial.moreTutorialsInFuture') }}</div>
    <Accordion>
      <AccordionPanel
        v-for="(tutorialProgress, tutorialID) in tutorialStore.getProgress"
        :key="`Tutorial-${tutorialID}`"
        :value="tutorialID"
      >
        <AccordionHeader>
          <div class="HeaderTemplate">
            <div>{{ t(`Tutorial.${tutorialID}.title`) }}</div>
            <div class="rightHeader">
              <div>{{ tutorialProgress.filter((d) => d === true).length }}/{{ tutorialProgress.length }}</div>
              <div class="checkbox">
                <div
                  v-if="tutorialProgress.every((d) => d === true)"
                  class="checkboxInner"
                />
              </div>
            </div>
          </div>
        </AccordionHeader>
        <AccordionContent>
          <div style="margin: 5px">{{ t(`Tutorial.${tutorialID}.time`) }}</div>
          <div style="margin: 5px">{{ t(`Tutorial.${tutorialID}.description`) }}</div>
          <Button
            style="margin: 5px"
            :label="t(`Tutorial.ButtonStartOverwiew.${getStartButton(tutorialProgress)}`)"
            @click="clickStartButton(tutorialID, tutorialProgress)"
          />
          <template
            v-for="(stepIsDone, tutorialStep) in tutorialProgress"
            :key="`Tutorial-${tutorialID}-key-${tutorialStep}`"
          >
            <Divider />
            <div
              class="nameElement"
              @click="startTutorial(tutorialID, tutorialStep)"
            >
              <div>{{ tutorialStep + 1 }}.</div>
              <div>{{ t(`Tutorial.${tutorialID}.${tutorialStep}.title`) }}</div>
              <div class="checkbox">
                <div
                  v-if="stepIsDone === true"
                  class="checkboxInner"
                />
              </div>
            </div>
          </template>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>

    <h2 style="margin-top: 35px">{{ t('Tutorial.replayHeader') }}</h2>
    <div style="margin-bottom: 15px">{{ t('Tutorial.replaysInFuture') }}</div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Divider from 'primevue/divider'

import router from '@/router/index'
import { injectStrict, SocketKey } from '@/services/injections'
import { useTutorialStore } from '@/store/tutorial'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const socket = injectStrict(SocketKey)
const tutorialStore = useTutorialStore()
tutorialStore.loadProgress(socket)

function startTutorial(tutorialID: number, tutorialStep: number) {
  router.push({ name: 'Tutorial', query: { tutorialID, tutorialStep } })
}

function getStartButton(tutorialProgress: boolean[]): string {
  if (tutorialProgress.every((d: boolean) => d === false)) {
    return 'start'
  }
  return tutorialProgress.every((d: boolean) => d === true) ? 'restart' : 'resume'
}

function clickStartButton(tutorialID: number, tutorialProgress: boolean[]) {
  if (tutorialProgress.every((d: boolean) => d === true)) {
    tutorialStore.resetTutorialProgress(socket, tutorialID)
    startTutorial(tutorialID, 0)
  } else {
    startTutorial(
      tutorialID,
      tutorialProgress.findIndex((d: boolean) => d === false)
    )
  }
}
</script>

<style scoped>
.tutorialPage {
  flex: 0 1 800px;
  max-width: 100%;
  padding: 10px;
}

.HeaderTemplate {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.rightHeader {
  display: flex;
  align-items: center;
}

.nameElement {
  display: flex;
  justify-content: space-between;
  margin: 0 20px;
  cursor: pointer;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 4px solid var(--surface-d);
  border-radius: 4px;
  flex: 0 0 auto;
  margin-left: 5px;
}

.checkboxInner {
  width: 100%;
  height: 100%;
  border-bottom: 4px solid green;
  border-right: 4px solid green;
  transform: translate(3px, -3px) rotate(45deg) scale(1, 2);
}
</style>
