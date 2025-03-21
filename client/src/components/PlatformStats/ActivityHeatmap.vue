<template>
  <VueApexCharts
    width="100%"
    height="100%"
    type="heatmap"
    :options="activityHeatmapOptions"
    :series="activityHeatmapSeries"
  />
</template>

<script setup lang="ts">
import type { ActivityHeatmap } from '@/../../server/src/sharedTypes/typesPlatformStatistic'
import VueApexCharts from 'vue3-apexcharts'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{ data?: ActivityHeatmap }>()
watch(
  () => props.data,
  () => {
    updateHeatmapChart()
  },
  { deep: true }
)

function updateHeatmapChart() {
  if (props.data === undefined) {
    return
  }
  for (let i = 0; i < 7; i++) {
    activityHeatmapSeries.value[i].data = props.data[i]
  }
}

const activityHeatmapOptions = {
  states: {
    active: {
      filter: {
        type: 'none' /* none, lighten, darken */,
      },
    },
  },
  chart: {
    id: 'vuechart-example',
    toolbar: {
      show: false,
    },
    background: '#ffffff00',
    foreColor: getComputedStyle(document.body).getPropertyValue('--text-color'),
  },
  theme: {
    mode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  },
  plotOptions: {
    heatmap: {
      shadeIntensity: 0.5,
      radius: 0,
      useFillColorAsStroke: true,
    },
  },
  colors: ['#008FFB'],
  tooltip: {
    enabled: false,
  },
  xaxis: {
    categories: ['🌙', '', '', '', '', '', '🌅', '', '', '', '', '☀️', '', '', '', '', '🌅', '', '', '', '', '', '🌙'],
    axisBorder: {
      color: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
    },
    axisTicks: {
      color: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
    },
  },
  grid: {
    borderColor: '#00000000',
  },
  stroke: {
    show: false,
  },
  dataLabels: {
    enabled: false,
  },
}

const activityHeatmapSeries = ref([
  {
    name: t('Stats.sunday'),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    name: t('Stats.saturday'),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    name: t('Stats.friday'),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    name: t('Stats.thursday'),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    name: t('Stats.wednesday'),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    name: t('Stats.tuesday'),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    name: t('Stats.monday'),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
])
</script>

<style scoped>
.week-container {
  width: 100%;
  position: relative;
}

.day-container {
  width: 100%;
  position: relative;
}
</style>
