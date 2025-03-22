<template>
  <div class="audioSwitchSlider">
    <Button
      :icon="`pi ${audioIcon}`"
      size="large"
      text
      rounded
      @click="audioButtonClick()"
    />
    <Slider
      v-model="localVolume"
      :min="0"
      :max="100"
      style="min-width: 200px"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Slider from 'primevue/slider'

import { computed } from 'vue'
import { sound } from '../../plugins/sound'

const localVolume = computed({
  get() {
    return sound.volume
  },
  set(value: number) {
    sound.$volume(value)
  },
})

const audioIcon = computed(() => {
  if (sound.volume === 0) {
    return 'pi-volume-off'
  }
  return sound.volume < 50 ? 'pi-volume-down' : 'pi-volume-up'
})

function audioButtonClick() {
  sound.$volume(sound.volume !== 0 ? 0 : 100)
}
</script>
