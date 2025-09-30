<template>
  <div>
    <table>
      <tbody>
        <tr>
          <th>{{ t('Profile.mostFrequent') + ':' }}</th>
          <td>{{ playerStats.players.mostFrequent }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.bestPlayer') + ':' }}</th>
          <td>{{ playerStats.players.bestPartner }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.worstPlayer') + ':' }}</th>
          <td>{{ playerStats.players.worstEnemy }}</td>
        </tr>
        <tr>
          <th>Letzte Spiele</th>
          <td>
            <GamesHistoryBadge
              v-for="game in playerStats.history"
              :win="game"
            />
          </td>
        </tr>
        <tr>
          <th>Beste Serie</th>
          <td>
            {{ playerStats.streaks.longestWinningStreak }}
            <GamesHistoryBadge :win="'won'" />
          </td>
        </tr>
        <tr>
          <th>Schlechteste Serie</th>
          <td>
            {{ playerStats.streaks.longestLosingStreak }}
            <GamesHistoryBadge :win="'lost'" />
          </td>
        </tr>
        <tr>
          <th>Aktuelle Serie</th>
          <td>{{ playerStats.streaks.currentStreak }}</td>
        </tr>
      </tbody>
    </table>
    <div class="chartNextToEachOtherContainer">
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
  </div>
</template>

<script setup lang="ts">
import ProfileRadar from '@/components/ProfileRadar.vue'
import UserGamesDougnut from '@/components/UserGamesDougnut.vue'
import type { PlayerFrontendStatistic } from '@/generatedClient'
import { useI18n } from 'vue-i18n'
import GamesHistoryBadge from '@/components/icons/GamesHistoryBadge.vue'

const { t } = useI18n()
defineProps<{ username: string; playerStats: PlayerFrontendStatistic; myStats: PlayerFrontendStatistic }>()
</script>

<style scoped>
.chartNextToEachOtherContainer {
  display: flex;
  flex-wrap: wrap;
  position: relative;
}

.chartNextToEachOther {
  flex: 1 1 200px;
  min-width: 0;
}
</style>
