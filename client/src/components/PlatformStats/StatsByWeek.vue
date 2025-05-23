<template>
  <Chart
    ref="weekChart"
    type="line"
    :data="weekChartData"
    :height="400"
    :options="weekChartOptions"
  />
</template>

<script setup lang="ts">
import type { WeekDatasetType } from '@/../../server/src/sharedTypes/typesPlatformStatistic'

import { ref, watch } from 'vue'
import Chart from 'primevue/chart'
import { getGraphColors } from '@/services/graphColors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const weekChart = ref<any | null>(null)
const props = defineProps<{ data?: WeekDatasetType }>()
watch(
  () => props.data,
  () => {
    updateWeekChart()
  },
  { deep: true }
)

function updateWeekChart() {
  if (props.data === undefined) {
    return
  }

  const dayIndexFromMonday = (new Date().getDay() + 6) % 7
  const currentHour = new Date().getUTCHours()

  const weekData = normalizeWeekData(props.data)

  weekChartData.value.datasets = []
  weekChartData.value.labels = weekData.map((x) => x[0])
  for (let i = 0; i < 2; i++) {
    weekChartData.value.datasets.push({
      data: weekData.map((x: any) => x[i + 1]),
      backgroundColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 0.1 }),
      borderColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 1 }),
      pointBackgroundColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 1 }),
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 1 }),
      label: i === 0 ? t('Stats.newUsers') : t('Stats.games'),
      fill: true,
    })

    const val = Math.round(weekData[weekData.length - 1][i === 0 ? 1 : 2] / props.data.passedRatio[i])
    weekChartData.value.datasets.push({
      data: weekData
        .map((x: any) => x[i + 1])
        .map((x: any, weekDataIndex: number) => {
          return weekDataIndex + 1 === weekData.length ? val : weekDataIndex + 2 < weekData.length ? null : x
        }),
      backgroundColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 0 }),
      borderColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 1 }),
      pointBackgroundColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 1 }),
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: getGraphColors({ elementNumber: i === 0 ? 2 : 0, alpha: 1 }),
      borderDash: [8, 5],
      shouldBeVisible: !(dayIndexFromMonday === 6 && currentHour >= 23) && val !== 0 && val !== weekData[weekData.length - 1][i === 0 ? 1 : 2],
      hidden: !(!(dayIndexFromMonday === 6 && currentHour >= 23) && val !== 0 && val !== weekData[weekData.length - 1][i === 0 ? 1 : 2]),
    })
  }

  weekChartData.value.datasets = weekChartData.value.datasets
    .slice(0, 2)
    .concat({
      data: weekData.map((x) => x[3]),
      backgroundColor: getGraphColors({ elementNumber: 1, alpha: 0.1 }),
      borderColor: getGraphColors({ elementNumber: 1, alpha: 1 }),
      pointBackgroundColor: getGraphColors({ elementNumber: 1, alpha: 1 }),
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: getGraphColors({ elementNumber: 1, alpha: 1 }),
      label: t('Stats.activeUsers'),
      fill: true,
    })
    .concat(weekChartData.value.datasets.slice(2, 4))

  weekChart.value?.refresh()
}

function normalizeWeekData(d: WeekDatasetType): Array<[string, number, number, number]> {
  const weekData: Array<[string, number, number, number]> = []

  for (const y in d.data) {
    for (const w in d.data[y]) {
      weekData.push([w, d.data[y][w][0], d.data[y][w][1], d.data[y][w][2]])
    }
  }

  return weekData
}

const weekChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

const weekChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        filter: function (legendItem: any) {
          return legendItem.text != null
        },
      },
      onClick: (_: any, legendItem: any) => {
        toggleVisibility(legendItem)
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
        zeroLineColor: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
      },
    },
    y: {
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

const toggleVisibility = (legendItem: any) => {
  weekChartData.value.datasets.forEach((ds: any, i: number) => {
    if (
      ((legendItem.datasetIndex === 0 && (i === 0 || i === 1)) || (legendItem.datasetIndex === 2 && i === 2) || (legendItem.datasetIndex === 3 && (i === 3 || i === 4))) &&
      (ds.shouldBeVisible === undefined || ds.shouldBeVisible === true)
    ) {
      ds.hidden = !ds.hidden
    }
  })
  weekChart.value?.refresh()
}
</script>
