<template>
  <div>
    <GameWatchingPlayers
      v-if="miscState.gameEndedText === ''"
      aria-label="Watching Players"
      class="watchingButton"
      :displayText="true"
      :nWatching="miscState.watchingData.nWatchingPlayers"
      :watchingPlayers="miscState.watchingData.watchingPlayerNames"
    />
    <div style="text-align: center">{{ $t('Game.Statistic.time') }}</div>
    <CountdownTimer
      :endDate="miscState.gameRunning ? new Date(miscState.created).toISOString() : undefined"
      :initialMilliseconds="Number(miscState.created) - Number(miscState.lastPlayed)"
      :mode="miscState.gameRunning ? 'up' : 'static'"
      largestUnit="hours"
    />
    <div>
      <TabView>
        <TabPanel :header="$t('Game.Statistic.Cards.title')">
          <div class="chart-container">
            <Chart
              type="bar"
              :data="cardStatistic"
              :options="optionsCards"
            />
          </div>
        </TabPanel>
        <TabPanel :header="$t('Game.Statistic.Actions.title')">
          <div class="chart-container">
            <Chart
              type="bar"
              :data="actionStatistics"
              :options="optionsActions"
            />
          </div>
        </TabPanel>
        <TabPanel
          :header="$t('Game.Statistic.CardsTable.title')"
          :disabled="miscState.gameRunning"
        >
          <div
            class="chart-container"
            style="overflow-y: auto"
          >
            <DataTable :value="statisticState.cardsTable">
              <Column
                field="card"
                :header="$t('Game.Statistic.CardsTable.card')"
              >
                <template #body="slotProps">
                  <div :class="`tac ${redText(slotProps.data.card) ? 'red' : ''}`">{{ cardName(slotProps.data.card) }}</div>
                </template>
              </Column>
              <Column
                v-for="i in [...Array(Object.keys(statisticState.cardsTable['1']).length - 1).keys()]"
                :key="`Column-${i}`"
                :field="i.toString()"
                :header="updateData?.playernames[i] ?? ''"
              />
            </DataTable>
          </div>
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup lang="ts">
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Chart from 'primevue/chart'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import CountdownTimer from '@/components/CountdownTimer.vue'
import GameWatchingPlayers from './GameWatchingPlayers.vue'

import type { MiscStateType } from '@/services/compositionGame/useMisc'
import type { StatisticStateType } from '@/services/compositionGame/useStatistic'
import { computed } from 'vue'
import { i18n } from '@/services/i18n'
import type { UpdateDataType } from '../../../../server/src/sharedTypes/typesDBgame'

const props = defineProps<{
  miscState: MiscStateType
  statisticState: StatisticStateType
  updateData: UpdateDataType | null
}>()

const cardStatistic = computed(() => {
  return props.statisticState.cardStatistic
})

const actionStatistics = computed(() => {
  return props.statisticState.actionStatistic
})

function redText(title: string) {
  return !['narr', 'krieger', 'tac', 'engel', 'trickser', 'teufel'].includes(title)
}

function cardName(title: string) {
  if (['narr', 'krieger', 'tac', 'engel', 'trickser', 'teufel'].includes(title)) {
    return i18n.global.t(`Game.Statistic.CardsTable.${title}`)
  }
  return title
}

const optionsCards = {
  maintainAspectRatio: true,
  responsive: true,
  plugins: { legend: { display: false } },
  tooltip: {
    mode: 'x',
    intersect: false,
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true },
  },
}
const optionsActions = {
  maintainAspectRatio: true,
  responsive: true,
  plugins: { legend: { display: false } },
  tooltip: {
    mode: 'x',
    intersect: false,
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true },
  },
}
</script>

<style scoped>
.chart-container {
  position: relative;
  max-height: 50vh;
  width: 100%;
}

.tac {
  font-family: 'tacfontregular', Monospace;
}

.red {
  color: var(--tac-red);
}

.watchingButton {
  margin: 0px 10px 10px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
