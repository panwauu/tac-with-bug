<template>
  <h2>Tutorials</h2>
  <div
    v-for="(data, index) in progressInEachTutorial"
    :key="`TutorialWidget-${index}`"
  >
    <Divider v-if="index !== 0" />
    <div style="display: flex; justify-content: space-between">
      <div>{{ $t(`Tutorial.${index}.title`) }}</div>
      <div>{{ data[0] }}/{{ data[1] }}</div>
    </div>
    <ProgressBar
      :value="Math.round((data[0] / data[1]) * 100)"
      :showValue="false"
    />
  </div>
</template>

<script setup lang="ts">
import ProgressBar from 'primevue/progressbar'
import Divider from 'primevue/divider'

import { injectStrict, SocketKey } from '@/services/injections'
import { useTutorialStore } from '@/store/tutorial'
import { computed } from 'vue'
const tutorialStore = useTutorialStore()
const socket = injectStrict(SocketKey)

tutorialStore.loadProgress(socket)
const progressInEachTutorial = computed(() =>
  tutorialStore.progress.map((p) => {
    return [p.filter((e) => e).length, p.length]
  })
)
</script>
