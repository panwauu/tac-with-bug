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
import type { activityHeatmap } from '@/../../shared/types/typesPlatformStatistic';
import VueApexCharts from 'vue3-apexcharts';
import { ref, watch } from 'vue';
import { i18n } from '@/services/i18n';

const props = defineProps<{ data?: activityHeatmap }>()
watch(() => props.data, () => { updateHeatmapChart() }, { deep: true })

function updateHeatmapChart() {
    if (props.data === undefined) { return }
    for (let i = 0; i < 7; i++) { activityHeatmapSeries.value[i].data = props.data[i] }
}

const activityHeatmapOptions = {
    states: {
        active: {
            filter: {
                type: 'none' /* none, lighten, darken */
            }
        }
    },
    chart: {
        id: 'vuechart-example',
        toolbar: {
            show: false
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
            color: getComputedStyle(document.body).getPropertyValue('--surface-d')
        },
        axisTicks: {
            color: getComputedStyle(document.body).getPropertyValue('--surface-d')
        }
    },
    grid: {
        borderColor: '#00000000'
    },
    stroke: {
        show: false,
    },
    dataLabels: {
        enabled: false
    },
}

const activityHeatmapSeries = ref([
    {
        name: i18n.global.t('Stats.sunday'),
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
        name: i18n.global.t('Stats.saturday'),
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
        name: i18n.global.t('Stats.friday'),
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
        name: i18n.global.t('Stats.thursday'),
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
        name: i18n.global.t('Stats.wednesday'),
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
        name: i18n.global.t('Stats.tuesday'),
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
        name: i18n.global.t('Stats.monday'),
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