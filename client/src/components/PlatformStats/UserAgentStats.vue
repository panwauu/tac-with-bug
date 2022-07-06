<template>
  <Chart
    ref="userAgentChat"
    type="pie"
    :data="browserChartData"
    :height="300"
    :options="userAgentChartOptions"
  />
  <Chart
    ref="userAgentDeviceChat"
    type="pie"
    :data="deviceChartData"
    :height="300"
    :options="userAgentChartOptions"
  />
  <Chart
    ref="userAgentOsChat"
    type="pie"
    :data="osChartData"
    :height="300"
    :options="userAgentChartOptions"
  />
</template>

<script setup lang="ts">
import type { userAgentAnalysisData } from '@/../../shared/types/typesPlatformStatistic'

import { ref, watch } from 'vue'
import Chart from 'primevue/chart'
import { getGraphColors } from '@/services/graphColors'
import { i18n } from '@/services/i18n'

const userAgentChat = ref<any | null>(null)
const userAgentDeviceChat = ref<any | null>(null)
const userAgentOsChat = ref<any | null>(null)
const props = defineProps<{ data?: userAgentAnalysisData }>()
watch(
  () => props.data,
  () => {
    updateUserAgentChart()
  },
  { deep: true }
)

function updateUserAgentChart() {
  if (props.data === undefined) {
    return
  }

  const browserData = groupAndSortData(props.data.browserNames, 0.02, i18n.global.t('Stats.others'))
  browserChartData.value.labels = browserData.map((e) => e[0])
  browserChartData.value.datasets = [
    {
      data: browserData.map((e) => e[1]),
      backgroundColor: getGraphColors({ alpha: 0.8 }),
    },
  ]
  userAgentChat.value?.refresh()

  const deviceData = groupAndSortData(props.data.deviceTypes, 0.01, 'others')
  deviceChartData.value.labels = deviceData.map((e) => i18n.global.t(`Stats.DeviceTypes.${e[0]}`))
  deviceChartData.value.datasets = [
    {
      data: deviceData.map((e) => e[1]),
      backgroundColor: getGraphColors({ alpha: 0.8 }),
    },
  ]
  userAgentDeviceChat.value?.refresh()

  const osData = groupAndSortData(props.data.osNames, 0.02, i18n.global.t('Stats.others'))
  osChartData.value.labels = osData.map((e) => e[0])
  osChartData.value.datasets = [
    {
      data: osData.map((e) => e[1]),
      backgroundColor: getGraphColors({ alpha: 0.8 }),
    },
  ]
  userAgentOsChat.value?.refresh()
}

const browserChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

const deviceChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

const osChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

const userAgentChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: function (context: any) {
          return `${context.label}: ${(context.parsed * 100).toFixed(2)} %`
        },
      },
    },
  },
}

function groupAndSortData(data: Record<string, number>, threshold: number, groupKeyName: string): [string, number][] {
  const entries = Object.entries(data)
  const overallDataPoints = entries.reduce((p, c) => p + c[1], 0)

  const othersElement: [string, number] = [groupKeyName, 0]
  let resultingArray: [string, number][] = []
  entries.forEach((e) => {
    if (e[1] / overallDataPoints < threshold) {
      othersElement[1] += e[1]
    } else {
      resultingArray.push(e)
    }
  })

  resultingArray = resultingArray.sort((a, b) => b[1] - a[1])
  if (othersElement[1] !== 0) {
    resultingArray.push(othersElement)
  }

  return resultingArray.map((e) => {
    return [e[0], e[1] / overallDataPoints]
  })
}
</script>

<style scoped></style>
