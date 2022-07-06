<template>
  <Chart
    ref="localeChart"
    type="pie"
    :data="localeChartData"
    :height="300"
    :options="localeChartOptions"
  />
</template>

<script setup lang="ts">
import type { LocaleDataset } from '@/../../server/src/sharedTypes/typesPlatformStatistic'

import { ref, watch } from 'vue'
import Chart from 'primevue/chart'
import { getGraphColors } from '@/services/graphColors'

const localeChart = ref<any | null>(null)
const props = defineProps<{ data?: LocaleDataset }>()
watch(
  () => props.data,
  () => {
    updateLocaleChart()
  },
  { deep: true }
)

function updateLocaleChart() {
  if (props.data === undefined) {
    return
  }

  const data = props.data
    .map((e: any) => {
      return { locale: e.locale, nUsers: parseInt(e.nUsers) }
    })
    .sort((a, b) => b.nUsers - a.nUsers)
  localeChartData.value.labels = data.map((e: any) => e.locale)
  localeChartData.value.datasets = [
    {
      label: 'test',
      backgroundColor: getGraphColors({ alpha: 0.8 }),
      data: data.map((e: any) => e.nUsers),
    },
  ]
  localeChart.value?.refresh()
}

const localeChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

const localeChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
}
</script>

<style scoped></style>
