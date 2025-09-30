<template>
  <div>
    <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 10px">
      <PlayerWithPicture
        :username="username"
        :name-first="false"
      />
      <PlayerWithPicture
        :username="usernameToCommpareTo"
        :name-first="true"
      />
    </div>

    <DataTable
      size="small"
      :value="tableValues"
      class="stats-table"
      :pt="{
        thead: { style: 'display: none' },
      }"
      :dt="{
        'datatable.background': 'transparent',
        'datatable.header.background': 'transparent',
        'datatable.border.color': 'black',
      }"
    >
      <Column field="value" />
      <Column field="label" />
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import PlayerWithPicture from './PlayerWithPicture.vue'
import { useI18n } from 'vue-i18n'
import type { PlayerRelationType } from '@/generatedClient'

const { t } = useI18n()
const props = defineProps<{
  username: string
  usernameToCommpareTo: string
  winRateOfCompareUser: number
  stats: PlayerRelationType
}>()

const winRateTogether = (props.stats[1] / props.stats[0]) * 100
const togetherDifference = winRateTogether - props.winRateOfCompareUser
const togetherDifferenceSign = togetherDifference >= 0 ? '+' : ''

const winRateAgainst = ((props.stats[2] - props.stats[3]) / props.stats[2]) * 100
const againstDifference = winRateAgainst - props.winRateOfCompareUser
const againstDifferenceSign = againstDifference >= 0 ? '+' : ''

const tableValues = [
  { value: props.stats[4], label: t('Profile.StatsWithPlayer.gamesTogetherTotal') },
  { value: props.stats[0], label: t('Profile.StatsWithPlayer.gamesPlayedTogether') },
  {
    value: Number.isNaN(winRateTogether) ? '-' : `${winRateTogether.toFixed(0)}% (${togetherDifferenceSign}${togetherDifference.toFixed(0)}%)`,
    label: t('Profile.StatsWithPlayer.successRateTogether', { user: props.usernameToCommpareTo }),
  },
  { value: props.stats[2], label: t('Profile.StatsWithPlayer.playedAgainst') },
  {
    value: Number.isNaN(winRateAgainst) ? '-' : `${winRateAgainst.toFixed(0)}% (${againstDifferenceSign}${againstDifference.toFixed(0)}%)`,
    label: t('Profile.StatsWithPlayer.successRateAgainst', { user: props.usernameToCommpareTo }),
  },
  { value: props.stats[4] - props.stats[2] - props.stats[0], label: t('Profile.StatsWithPlayer.gamesPlayedCoop') },
]
</script>

<style scoped>
.playerCardElement {
  white-space: nowrap;
}

.stats-table {
  background: transparent !important;
}
</style>
