<template>
  <Chart
    ref="weekChart"
    type="line"
    :data="weekChartData"
    :height="400"
    :options="weekChartOptions"
    :plugins="[yearMarkerPlugin]"
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
  weekKeys.value = weekData.map((x) => ({ year: x[4], week: x[0] }))
  weekChartData.value.labels = weekKeys.value.map((key) => key.week)
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

function normalizeWeekData(d: WeekDatasetType): Array<[string, number, number, number, string]> {
  const weekData: Array<[string, number, number, number, string]> = []

  for (const y in d.data) {
    for (const w in d.data[y]) {
      weekData.push([w, d.data[y][w][0], d.data[y][w][1], d.data[y][w][2], y])
    }
  }

  return weekData
}

const weekKeys = ref<Array<{ year: string; week: string }>>([])

function isFirstWeekOfYear(index: number) {
  if (weekKeys.value[index] === undefined) {
    return false
  }
  return index === 0 || weekKeys.value[index].year !== weekKeys.value[index - 1].year
}

// The marker line is only drawn between two years, not at the very first (usually incomplete) one.
function isYearBoundary(index: number) {
  return index > 0 && isFirstWeekOfYear(index)
}

// Draws a vertical line at every year change, labelled with the year in vertical text at its top
const yearMarkerPlugin = {
  id: 'yearMarker',
  afterDatasetsDraw: (chart: any) => {
    const xScale = chart.scales.x
    if (xScale === undefined) {
      return
    }

    const ctx = chart.ctx
    const color = getComputedStyle(document.body).getPropertyValue('--p-text-muted-color')

    for (const [index, key] of weekKeys.value.entries()) {
      if (!isYearBoundary(index)) {
        continue
      }

      const x = xScale.getPixelForValue(index)
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, chart.chartArea.top)
      ctx.lineTo(x, chart.chartArea.bottom)
      ctx.stroke()

      ctx.translate(x, chart.chartArea.top + 4)
      ctx.rotate(Math.PI / 2)
      ctx.setLineDash([])
      ctx.fillStyle = color
      ctx.font = '12px Avenir, Helvetica, Arial, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(key.year, 0, -3)
      ctx.restore()
    }
  },
}

function formatWeekKey(index: number) {
  const key = weekKeys.value[index]
  return key === undefined ? '' : `${key.year}/${key.week.padStart(2, '0')}`
}

const weekChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

const weekChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        title: (tooltipItems: any[]) => formatWeekKey(tooltipItems[0]?.dataIndex),
      },
    },
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
  for (const [i, ds] of weekChartData.value.datasets.entries()) {
    if (
      ((legendItem.datasetIndex === 0 && (i === 0 || i === 1)) || (legendItem.datasetIndex === 2 && i === 2) || (legendItem.datasetIndex === 3 && (i === 3 || i === 4))) &&
      (ds.shouldBeVisible === undefined || ds.shouldBeVisible === true)
    ) {
      ds.hidden = !ds.hidden
    }
  }
  weekChart.value?.refresh()
}
</script>
