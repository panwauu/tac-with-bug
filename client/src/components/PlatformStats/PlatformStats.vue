<template>
  <h1>{{ t('Stats.headerWeeks') }}</h1>
  <div class="chart-container">
    <StatsByWeek :data="data?.weekDataset" />
  </div>
  <h1>{{ t('Stats.headerActivityHeatmap') }}</h1>
  <div
    class="chart-container"
    style="height: 0; padding-top: 30%; overflow: hidden"
  >
    <div style="position: absolute; top: 0; left: 0; height: 100%; width: 100%">
      <ActivityHeatmap :data="data?.activityHeatmap" />
    </div>
  </div>
  <h1>{{ t('Stats.headerDays') }}</h1>
  <div class="chart-container">
    <StatsByDay :data="data?.dayDataset" />
  </div>
  <h1>{{ t('Stats.headerHours') }}</h1>
  <div class="chart-container">
    <StatsByHour :data="data?.hourDataset" />
  </div>
  <h1>{{ t('Stats.headerLocales') }}</h1>
  <div class="chart-container">
    <LocaleStats :data="data?.localeDataset" />
  </div>
  <h1>{{ t('Stats.headerUserAgent') }}</h1>
  <div class="chart-container">
    <UserAgentStats :data="data?.userAgentDataset" />
  </div>
  <h1>{{ t('Stats.headerBotWinshare') }}</h1>
  <div class="chart-container">
    <BotStats :data="data?.botDataset" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import StatsByWeek from './StatsByWeek.vue'
import ActivityHeatmap from './ActivityHeatmap.vue'
import LocaleStats from './LocaleStats.vue'
import StatsByHour from './StatsByHour.vue'
import StatsByDay from './StatsByDay.vue'
import UserAgentStats from './UserAgentStats.vue'
import BotStats from './BotStats.vue'

import type { PlatformStats } from '@/../../server/src/sharedTypes/typesPlatformStatistic'
import { ref } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'

const data = ref<PlatformStats | null>(null)
Service.getPlatformStats().then((res) => {
  data.value = res
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  position: relative;
}
</style>
