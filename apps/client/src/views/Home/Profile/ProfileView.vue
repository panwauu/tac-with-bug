<template>
  <div class="profileSection">
    <table>
      <tbody>
        <tr>
          <th>{{ t('Profile.mostFrequent') + ':' }}</th>
          <td>
            <PlayerWithPicture
              :username="mostFrequent"
              :name-first="false"
            />
          </td>
        </tr>
        <tr>
          <th>{{ t('Profile.bestPlayer') + ':' }}</th>
          <PlayerWithPicture
            :username="bestTeammate"
            :name-first="false"
          />
        </tr>
        <tr>
          <th>{{ t('Profile.worstPlayer') + ':' }}</th>
          <td>
            <PlayerWithPicture
              :username="worstEnemy"
              :name-first="false"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <table>
      <tbody>
        <tr>
          <th>Beste Serie</th>
          <td>
            <div style="display: flex; align-items: center">
              {{ playerStats.streaks.longestWinningStreak }}
              <GamesHistoryBadge :win="'won'" />
            </div>
          </td>
        </tr>
        <tr>
          <th>Schlechteste Serie</th>
          <td>
            <div style="display: flex; align-items: center">
              {{ playerStats.streaks.longestLosingStreak }}
              <GamesHistoryBadge :win="'lost'" />
            </div>
          </td>
        </tr>
        <tr>
          <th>Aktuelle Serie</th>
          <td>
            <div style="display: flex; align-items: center">
              {{ playerStats.streaks.currentStreak }}
              <GamesHistoryBadge :win="playerStats.streaks.currentStreak < 0 ? 'lost' : 'won'" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <ProfileRadar
      :username="username"
      :data="playerStats.table"
      :my-data="myStats.table"
      class="chartNextToEachOther"
    />
    <UserGamesDougnut
      :data="playerStats.gamesDistribution"
      :username="username"
      class="chartNextToEachOther"
      style="padding: 0 20px"
    />
  </div>
</template>

<script setup lang="ts">
import ProfileRadar from '@/components/ProfileRadar.vue'
import UserGamesDougnut from '@/components/UserGamesDougnut.vue'
import type { PlayerFrontendStatistic } from '@/generatedClient'
import { useI18n } from 'vue-i18n'
import GamesHistoryBadge from '@/components/icons/GamesHistoryBadge.vue'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'

const { t } = useI18n()
const props = defineProps<{ username: string; playerStats: PlayerFrontendStatistic; myStats: PlayerFrontendStatistic }>()

// Get the biggest element e[0] in props.playersStats.players
const mostFrequent = Object.keys(props.playerStats.people).reduce((prevKey, currentKey) => {
  return props.playerStats.people[currentKey][0] > props.playerStats.people[prevKey][0] ? currentKey : prevKey
})
const bestTeammate = Object.keys(props.playerStats.people).reduce((prevKey, currentKey) => {
  return props.playerStats.people[currentKey][1] / (props.playerStats.people[currentKey][0] || 100000) >
    props.playerStats.people[prevKey][1] / (props.playerStats.people[prevKey][0] || 100000)
    ? currentKey
    : prevKey
})
const worstEnemy = Object.keys(props.playerStats.people).reduce((prevKey, currentKey) => {
  return (props.playerStats.people[currentKey][2] - props.playerStats.people[currentKey][3]) / (props.playerStats.people[currentKey][2] || 100000) >
    (props.playerStats.people[prevKey][2] - props.playerStats.people[prevKey][3]) / (props.playerStats.people[prevKey][2] || 100000)
    ? currentKey
    : prevKey
})
</script>

<style scoped>
.profileSection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 500px) {
  .profileSection {
    grid-template-columns: 1fr;
  }
}
</style>
