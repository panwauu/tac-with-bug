<template>
  <Chart
    ref="botWinshareChart"
    type="pie"
    :data="botWinshareChartData"
    :height="300"
    :options="chartOptions"
  />
</template>

<script setup lang="ts">
import type { BotDataset } from '@/../../server/src/sharedTypes/typesPlatformStatistic'

import { ref, watch } from 'vue'
import Chart from 'primevue/chart'
import { getGraphColors } from '@/services/graphColors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const botWinshareChart = ref<any | null>(null)
const props = defineProps<{ data?: BotDataset }>()
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

  botWinshareChartData.value.labels = [t('Stats.BotWinshare.lost'), t('Stats.BotWinshare.won')]
  botWinshareChartData.value.datasets = [
    {
      data: [props.data.total - props.data.won, props.data.won],
      backgroundColor: getGraphColors({ alpha: 0.8 }),
    },
  ]
  botWinshareChart.value?.refresh()
}

const botWinshareChartData = ref({
  labels: [] as any[],
  datasets: [] as any[],
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      reverse: true,
    },
  },
}
</script>
