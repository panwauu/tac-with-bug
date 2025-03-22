<template>
  <Chart
    ref="dayChart"
    type="radar"
    :data="dayChartData"
    :height="400"
    :options="dayChartOptions"
  />
</template>

<script setup lang="ts">
import type { DayDatasetType } from '@/../../server/src/sharedTypes/typesPlatformStatistic'

import { ref, watch } from 'vue'
import Chart from 'primevue/chart'
import { getGraphColors } from '@/services/graphColors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const dayChart = ref<any | null>(null)
const props = defineProps<{ data?: DayDatasetType }>()
watch(
  () => props.data,
  () => {
    updateDayChart()
  },
  { deep: true }
)

const dayChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  elements: {
    line: {
      tension: 0.02,
    },
  },
  scales: {
    r: {
      angleLines: {
        color: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
        zeroLineColor: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
        display: true,
      },
      beginAtZero: true,
      ticks: {
        callback: function (value: any) {
          return value + '%'
        },
        showLabelBackdrop: false,
      },
      grid: {
        color: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
      },
    },
  },
}

const dayChartData = ref({
  datasets: [
    {
      data: [0, 0, 0, 0, 0, 0, 0],
      backgroundColor: getGraphColors({ alpha: 0.2, elementNumber: 0 }),
      borderColor: getGraphColors({ alpha: 1, elementNumber: 0 }),
      pointBackgroundColor: getGraphColors({ alpha: 1, elementNumber: 0 }),
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: getGraphColors({ alpha: 1, elementNumber: 0 }),
      label: t('Stats.users'),
    },
    {
      data: [0, 0, 0, 0, 0, 0, 0],
      backgroundColor: getGraphColors({ alpha: 0.2, elementNumber: 1 }),
      borderColor: getGraphColors({ alpha: 1, elementNumber: 1 }),
      pointBackgroundColor: getGraphColors({ alpha: 1, elementNumber: 1 }),
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: getGraphColors({ alpha: 1, elementNumber: 1 }),
      label: t('Stats.games'),
    },
  ],
  labels: [t('Stats.monday'), t('Stats.tuesday'), t('Stats.wednesday'), t('Stats.thursday'), t('Stats.friday'), t('Stats.saturday'), t('Stats.sunday')],
})

function updateDayChart() {
  if (props.data === undefined) {
    return
  }
  dayChartData.value.datasets[0].data = props.data.map((d: any) => d[0] * 100)
  dayChartData.value.datasets[1].data = props.data.map((d: any) => d[1] * 100)
  dayChart.value?.refresh()
}
</script>
