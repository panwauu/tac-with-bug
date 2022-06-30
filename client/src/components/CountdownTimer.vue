<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      align-items: stretch;
      position: relative;
    "
  >
    <div ref="timerContainerRef" class="timerContainer">
      <template v-for="(element, i) in elements" :key="`timerElement-${element}`">
        <div class="timerElement">
          <div>{{ numbers[i] }}</div>
          <div v-if="detail">{{ $tc(`CountdownTimer.${element}`, numbers[i]) }}</div>
        </div>
        <div v-if="detail === false && i < elements.length - 1">:</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, ref, onMounted, onUnmounted, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';

const props = withDefaults(
  defineProps<{
    endDate?: string
    initialMilliseconds?: number
    mode?: string
    displayDays?: boolean
  }>(),
  {
    endDate: undefined,
    initialMilliseconds: undefined,
    mode: 'down',
    displayDays: true
  });


const elements = props.displayDays ? ['days', 'hours', 'minutes', 'seconds'] : ['hours', 'minutes', 'seconds']
const units = props.displayDays ? [60 * 60 * 24, 60 * 60, 60, 1] : [60 * 60, 60, 1]

const getParsedEndDate = () => {
  if (props.endDate != undefined) {
    return Date.parse(props.endDate);
  } else if (props.initialMilliseconds != undefined) {
    return Date.now() + props.initialMilliseconds;
  } else {
    return Date.now();
  }
}

let numbers = ref([0, 0, 0, 0])
let parsedEndDate = ref(getParsedEndDate())
let interval = ref<number | undefined>()
let detail = ref(true)

const timerContainerRef = ref<HTMLDivElement | null>(null);

const startUpdateNumbers = () => { interval.value = window.setInterval(updateNumbers, 1000) }
const stopUpdateNumbers = () => { window.clearInterval(interval.value) }

const updateNumbers = () => {
  let diffSeconds = Math.floor((parsedEndDate.value - Date.now()) / 1000);
  if (
    (diffSeconds <= 0 && props.mode === 'down') ||
    (diffSeconds >= 0 && props.mode === 'up')
  ) {
    numbers.value = [0, 0, 0, 0];
    return;
  }

  diffSeconds = Math.abs(diffSeconds);
  units.forEach((u, i) => {
    numbers.value[i] = Math.floor(diffSeconds / u);
    diffSeconds -= numbers.value[i] * u;
  });
}

useResizeObserver(timerContainerRef, () => { updateDetail() })
const updateDetail = () => {
  if (timerContainerRef.value?.clientWidth != null && timerContainerRef.value?.clientWidth < 400) {
    detail.value = false;
  } else {
    detail.value = true;
  }
}

const initializeUpdateNumbers = () => {
  stopUpdateNumbers();
  parsedEndDate.value = getParsedEndDate()
  updateNumbers();

  if (props.mode !== 'static') { startUpdateNumbers() }
}
initializeUpdateNumbers()

watch(() => props.endDate, () => { initializeUpdateNumbers() })
watch(() => props.mode, () => { initializeUpdateNumbers() })
watch(() => props.initialMilliseconds, () => { initializeUpdateNumbers() })

onMounted(() => {
  updateDetail();
  addEventListener('resize', updateDetail);
})

onUnmounted(() => {
  removeEventListener('resize', updateDetail);
  stopUpdateNumbers();
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
  background-color: var(--surface-b);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
