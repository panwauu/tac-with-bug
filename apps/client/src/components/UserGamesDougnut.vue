<template>
  <div>
    <Chart
      ref="userGamesDoughnutChart"
      type="doughnut"
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup lang="ts">
import type { GamesDistributionData } from '@/../../server/src/sharedTypes/typesPlayerStatistic'
import { ref, onMounted, watch } from 'vue'
import Chart from 'primevue/chart'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{ data: GamesDistributionData }>()
const userGamesDoughnutChart = ref<null | InstanceType<typeof Chart>>()

const chartData = ref({
  labels: [
    t('Profile.DistributionGraph.4er'),
    t('Profile.DistributionGraph.6er'),
    t('Profile.DistributionGraph.team'),
    t('Profile.DistributionGraph.aborted'),
    t('Profile.DistributionGraph.running'),
  ],
  datasets: [
    {
      data: [] as any[],
      backgroundColor: ['#36459a', '#8893d1', '#d1d5ed', '#FBC02D', '#0288D1'],
      hoverBackgroundColor: ['#36459a', '#8893d1', '#d1d5ed', '#FBC02D', '#0288D1'],
      labels: [
        t('Profile.DistributionGraph.4er'),
        t('Profile.DistributionGraph.6er'),
        t('Profile.DistributionGraph.team'),
        t('Profile.DistributionGraph.aborted'),
        t('Profile.DistributionGraph.running'),
      ],
    },
    {
      data: [] as any[],
      backgroundColor: ['#689F38', '#D32F2F', '#689F38', '#D32F2F', '#689F38', '#D32F2F', '#00000000'],
      hoverBackgroundColor: ['#689F38', '#D32F2F', '#689F38', '#D32F2F', '#689F38', '#D32F2F', '#00000000'],
      labels: [
        `${t('Profile.DistributionGraph.4er')} ${t('Profile.DistributionGraph.won')}`,
        `${t('Profile.DistributionGraph.4er')} ${t('Profile.DistributionGraph.lost')}`,
        `${t('Profile.DistributionGraph.6er')} ${t('Profile.DistributionGraph.won')}`,
        `${t('Profile.DistributionGraph.6er')} ${t('Profile.DistributionGraph.lost')}`,
        t('Profile.DistributionGraph.teamEnded'),
        t('Profile.DistributionGraph.teamAborted'),
      ],
    },
  ],
})
const chartOptions = {
  responsive: true,
  borderColor: getComputedStyle(document.body).getPropertyValue('--background-contrastest'),
  borderWidth: 3,
  plugins: {
    legend: {
      onClick: () => {
        return
      },
    },
    tooltip: {
      filter: function (context: any) {
        return context.dataset.labels[context.dataIndex] != null
      },
      callbacks: {
        label: function (context: any) {
          return `${context.dataset.labels[context.dataIndex]}: ${context.formattedValue}`
        },
      },
    },
  },
}

function resetGraph(data: GamesDistributionData) {
  chartData.value.datasets[0].data = [data.won4 + data.lost4, data.won6 + data.lost6, data.teamWon + data.teamAborted, data.aborted, data.running]
  chartData.value.datasets[1].data = [data.won4, data.lost4, data.won6, data.lost6, data.teamWon, data.teamAborted, data.aborted + data.running]
  userGamesDoughnutChart.value?.refresh()
}

onMounted(() => {
  resetGraph(props.data)
})

watch(
  () => props.data,
  () => {
    resetGraph(props.data)
  },
  { deep: true }
)
</script>
