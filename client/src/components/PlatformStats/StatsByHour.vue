<template>
  <Chart
    ref="hourChart"
    type="line"
    :data="hourChartData"
    :height="400"
    :options="hourChartOptions"
  />
</template>

<script setup lang="ts">
import type { HourDatasetType } from '@/../../server/src/sharedTypes/typesPlatformStatistic'

import { ref, watch } from 'vue'
import Chart from 'primevue/chart'
import { getGraphColors } from '@/services/graphColors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const hourChart = ref<any | null>(null)
const props = defineProps<{ data?: HourDatasetType }>()
watch(
  () => props.data,
  () => {
    updateHourChart()
  },
  { deep: true }
)

const hourChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      grid: {
        color: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
        zeroLineColor: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
      },
      ticks: {
        min: 0,
        callback: function (value: any) {
          return value + '%' // convert it to percentage
        },
      },
    },
    x: {
      grid: {
        color: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
        zeroLineColor: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
      },
    },
  },
  elements: {
    line: {
      lineTension: 0.4,
    },
  },
}

const hourChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

function updateHourChart() {
  if (props.data === undefined) {
    return
  }

  const posTimeZoneOffset = (Math.floor(new Date().getTimezoneOffset() / 60) + 24) % 24
  const hourDataOffseted = [...props.data.slice(posTimeZoneOffset, 24), ...props.data.slice(0, posTimeZoneOffset)]
  hourChartData.value.datasets = []
  hourChartData.value.labels = hourDataOffseted.map((_: any, i: number) => i)
  hourChartData.value.datasets.push({
    data: hourDataOffseted.map((x: any) => x[0] * 100),
    backgroundColor: getGraphColors({ alpha: 0.2, elementNumber: 0 }),
    borderColor: getGraphColors({ alpha: 1, elementNumber: 0 }),
    pointBackgroundColor: getGraphColors({ alpha: 1, elementNumber: 0 }),
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: getGraphColors({ alpha: 1, elementNumber: 0 }),
    label: t('Stats.users'),
    fill: true,
  })
  hourChartData.value.datasets.push({
    data: hourDataOffseted.map((x: any) => x[1] * 100),
    backgroundColor: getGraphColors({ alpha: 0.2, elementNumber: 1 }),
    borderColor: getGraphColors({ alpha: 1, elementNumber: 1 }),
    pointBackgroundColor: getGraphColors({ alpha: 1, elementNumber: 1 }),
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: getGraphColors({ alpha: 1, elementNumber: 1 }),
    label: t('Stats.games'),
    fill: true,
  })
  hourChart.value?.refresh()
}
</script>
