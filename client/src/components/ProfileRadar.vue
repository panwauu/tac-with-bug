<template>
  <div>
    <Chart
      ref="profileRadarChart"
      type="radar"
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import Chart from 'primevue/chart'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { username as loggedInUsername } from '@/services/useUser'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{
  data: number[]
  username: string
}>()

const profileRadarChart = ref<any | null>(null)

const chartData = ref({
  labels: [
    t('Profile.success'),
    t('Profile.generosity'),
    t('Profile.aggression'),
    t('Profile.decision'),
    t('Profile.resentment'),
    t('Profile.usage'),
    t('Profile.abortionrate'),
  ],
  datasets: [] as any[],
})

const chartOptions = {
  responsive: true,
  scales: {
    r: {
      angleLines: {
        color: getComputedStyle(document.body).getPropertyValue('--surface-d'),
        display: true,
      },
      beginAtZero: true,
      ticks: {
        suggestedMin: 0,
        suggestedMax: 100,
        showLabelBackdrop: false,
      },
      grid: {
        color: getComputedStyle(document.body).getPropertyValue('--surface-d'),
      },
    },
  },
}

const resetGraph = async (data: any) => {
  if (data === null || data.length === 0) {
    return
  }

  const newChartDataset: any[] = []

  if (loggedInUsername.value != null) {
    const currentUserDataset = chartData.value.datasets.find((d) => d.order === 2)
    if (currentUserDataset != null) {
      newChartDataset.push(currentUserDataset)
    } else {
      const stats = await Service.getPlayerStats(loggedInUsername.value)
      newChartDataset.push({
        label: loggedInUsername.value ?? '',
        backgroundColor: '#25602950',
        borderColor: '#256029',
        pointBackgroundColor: '#256029',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255,99,132,1)',
        data: stats.table,
        order: 2,
      })
    }
  }

  if (loggedInUsername.value !== props.username) {
    newChartDataset.push({
      label: props.username,
      backgroundColor: '#c6373750',
      borderColor: '#c63737',
      pointBackgroundColor: '#c63737',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(255,99,132,1)',
      data: data,
      order: 1,
    })
  }

  chartData.value.datasets = newChartDataset
  profileRadarChart.value?.refresh()
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
