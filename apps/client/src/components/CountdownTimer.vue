<template>
  <div style="display: flex; flex-direction: column; align-items: stretch; position: relative">
    <div
      ref="timerContainerRef"
      class="timerContainer"
    >
      <template
        v-for="(element, i) in elements"
        :key="`timerElement-${element}`"
      >
        <div class="timerElement">
          <div>{{ numbers[i] }}</div>
          <div v-if="detail">{{ t(`CountdownTimer.${element}`, numbers[i]) }}</div>
        </div>
        <div v-if="detail === false && i < elements.length - 1">:</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

type UnitKey = 'days' | 'hours' | 'minutes' | 'seconds'

const props = withDefaults(
  defineProps<{
    endDate?: string
    initialMilliseconds?: number
    mode?: string
    largestUnit?: UnitKey
    smallestUnit?: UnitKey
  }>(),
  {
    endDate: undefined,
    initialMilliseconds: undefined,
    mode: 'down',
    largestUnit: 'days',
    smallestUnit: 'seconds',
  }
)

const { t } = useI18n()

const possibleElements: UnitKey[] = ['days', 'hours', 'minutes', 'seconds']
const indexOfLargestElement = possibleElements.indexOf(props.largestUnit)
const indexOfSmallestElement = possibleElements.indexOf(props.smallestUnit)
if (indexOfSmallestElement < indexOfLargestElement) {
  throw new Error('Could not load Timer as largest element was smaller than smallest element')
}

const unitToSeconds: Record<UnitKey, number> = {
  days: 60 * 60 * 24,
  hours: 60 * 60,
  minutes: 60,
  seconds: 1,
}

const elements = (['days', 'hours', 'minutes', 'seconds'] as UnitKey[]).slice(indexOfLargestElement, indexOfSmallestElement + 1)

const getParsedEndDate = () => {
  if (props.endDate != null) {
    return Date.parse(props.endDate)
  } else if (props.initialMilliseconds != null) {
    return Date.now() + props.initialMilliseconds
  } else {
    return Date.now()
  }
}

const numbers = ref([0, 0, 0, 0])
const parsedEndDate = ref(getParsedEndDate())
const interval = ref<number | undefined>()
const detail = ref(true)

const timerContainerRef = ref<HTMLDivElement | null>(null)

const startUpdateNumbers = () => {
  interval.value = window.setInterval(updateNumbers, unitToSeconds[elements[elements.length - 1]] * 100)
}
const stopUpdateNumbers = () => {
  window.clearInterval(interval.value)
}

const updateNumbers = () => {
  let diffSeconds = Math.floor((parsedEndDate.value - Date.now()) / 1000)
  if ((diffSeconds <= 0 && props.mode === 'down') || (diffSeconds >= 0 && props.mode === 'up')) {
    numbers.value = [0, 0, 0, 0]
    return
  }

  diffSeconds = Math.abs(diffSeconds)
  for (const [i, e] of elements.entries()) {
    numbers.value[i] = Math.floor(diffSeconds / unitToSeconds[e])
    diffSeconds -= numbers.value[i] * unitToSeconds[e]
  }
}

useResizeObserver(timerContainerRef, () => {
  updateDetail()
})
const updateDetail = () => {
  if (timerContainerRef.value?.clientWidth != null && timerContainerRef.value?.clientWidth < 100 * elements.length) {
    detail.value = false
  } else {
    detail.value = true
  }
}

const initializeUpdateNumbers = () => {
  stopUpdateNumbers()
  parsedEndDate.value = getParsedEndDate()
  updateNumbers()

  if (props.mode !== 'static') {
    startUpdateNumbers()
  }
}
initializeUpdateNumbers()

watch(
  () => props.endDate,
  () => {
    initializeUpdateNumbers()
  }
)
watch(
  () => props.mode,
  () => {
    initializeUpdateNumbers()
  }
)
watch(
  () => props.initialMilliseconds,
  () => {
    initializeUpdateNumbers()
  }
)

onMounted(() => {
  updateDetail()
  addEventListener('resize', updateDetail)
})

onUnmounted(() => {
  removeEventListener('resize', updateDetail)
  stopUpdateNumbers()
})
</script>

<style scoped>
.timerContainer {
  display: flex;
  justify-content: center;
  align-items: center;
}
.timerElement {
  margin: 10px;
  padding: 10px;
  border-radius: 10px;
  background-color: var(--background-contraster);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
