<template>
  <div class="profileSection">
    <div>
      <Carousel
        style="max-width: 700px; margin: 0 auto"
        :value="carouselOptions"
        :autoplay-interval="5000"
        :circular="true"
        :num-scroll="1"
        :num-visible="1"
        :pt="{ indicatorList: { style: 'padding-top: 0;' } }"
      >
        <template #item="slotProps">
          <div v-if="slotProps.data === 'games'">
            <table class="carousel-element">
              <tbody>
                <tr>
                  <th>{{ t('Profile.mostFrequent') + ':' }}</th>
                  <td
                    class="games-with clickable"
                    @click="showPopover($event, mostFrequent)"
                  >
                    <div class="games-with-number">
                      {{ props.playerStats.people[mostFrequent][4] }}
                      <i
                        class="pi pi-info-circle"
                        style="margin-left: 5px"
                      />
                    </div>
                    <PlayerWithPicture
                      :username="mostFrequent"
                      :name-first="false"
                    />
                  </td>
                </tr>
                <tr>
                  <th>{{ t('Profile.bestPlayer') + ':' }}</th>
                  <td
                    class="games-with clickable"
                    @click="showPopover($event, bestTeammate)"
                  >
                    <div class="games-with-number">
                      {{ props.playerStats.people[bestTeammate][1] }}
                      <i
                        class="pi pi-info-circle"
                        style="margin-left: 5px"
                      />
                    </div>
                    <PlayerWithPicture
                      :username="bestTeammate"
                      :name-first="false"
                    />
                  </td>
                </tr>
                <tr>
                  <th>{{ t('Profile.worstPlayer') + ':' }}</th>
                  <td
                    class="games-with clickable"
                    @click="showPopover($event, worstEnemy)"
                  >
                    <div class="games-with-number">
                      {{ props.playerStats.people[worstEnemy][2] - props.playerStats.people[worstEnemy][3] }}
                      <i
                        class="pi pi-info-circle"
                        style="margin-left: 5px"
                      />
                    </div>
                    <PlayerWithPicture
                      :username="worstEnemy"
                      :name-first="false"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="slotProps.data === 'winshares'">
            <table class="carousel-element">
              <tbody>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.winsharesTitle') }}</th>
                  <td>
                    <small>{{ t('Profile.winsharesTitleExp') }}</small>
                  </td>
                </tr>
                <tr>
                  <th>{{ t('Profile.bestPlayer') + ':' }}</th>
                  <td
                    class="games-with clickable"
                    @click="showPopover($event, bestTeammateByShare)"
                  >
                    <div class="games-with-number">
                      {{
                        ((props.playerStats.people[bestTeammateByShare][1] / (props.playerStats.people[bestTeammateByShare][0] || Number.MAX_SAFE_INTEGER)) * 100).toFixed(0)
                      }}%
                      <i
                        class="pi pi-info-circle"
                        style="margin-left: 5px"
                      />
                    </div>
                    <PlayerWithPicture
                      :username="bestTeammateByShare"
                      :name-first="false"
                    />
                  </td>
                </tr>
                <tr>
                  <th>{{ t('Profile.worstPlayer') + ':' }}</th>
                  <td
                    class="games-with clickable"
                    @click="showPopover($event, worstEnemyByShare)"
                  >
                    <div class="games-with-number">
                      {{
                        (
                          ((props.playerStats.people[worstEnemyByShare][2] - props.playerStats.people[worstEnemyByShare][3]) /
                            (props.playerStats.people[worstEnemyByShare][2] || Number.MAX_SAFE_INTEGER)) *
                          100
                        ).toFixed(0)
                      }}%
                      <i
                        class="pi pi-info-circle"
                        style="margin-left: 5px"
                      />
                    </div>
                    <PlayerWithPicture
                      :username="worstEnemyByShare"
                      :name-first="false"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="slotProps.data === 'streaks'">
            <table class="carousel-element">
              <tbody>
                <tr>
                  <th>{{ t('Profile.bestStreak') + ':' }}</th>
                  <td>
                    <div style="display: flex; align-items: center">
                      <div class="history-badge-stack-number">{{ longestWinningStreak }}</div>
                      <div class="history-badge-stack">
                        <GamesHistoryBadge
                          :win="'won'"
                          v-for="index in Math.min(longestWinningStreak, 20)"
                          :key="index"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>{{ t('Profile.worstStreak') + ':' }}</th>
                  <td>
                    <div style="display: flex; align-items: center">
                      <div class="history-badge-stack-number">{{ longestLosingStreak }}</div>
                      <div class="history-badge-stack">
                        <GamesHistoryBadge
                          :win="'lost'"
                          v-for="index in Math.min(longestLosingStreak, 20)"
                          :key="index"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>{{ t('Profile.currentStreak') + ':' }}</th>
                  <td>
                    <div style="display: flex; align-items: center">
                      <div class="history-badge-stack-number">{{ currentStreak }}</div>
                      <div class="history-badge-stack">
                        <GamesHistoryBadge
                          :win="currentStreak < 0 ? 'lost' : 'won'"
                          v-for="index in Math.min(Math.abs(currentStreak), 20)"
                          :key="index"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="slotProps.data === 'coop'">
            <table class="carousel-element">
              <tbody>
                <tr>
                  <th>{{ t('Profile.mostFrequentCoop') + ':' }}</th>
                  <td
                    class="games-with clickable"
                    @click="showPopover($event, mostFrequentCoop)"
                  >
                    <div class="games-with-number">
                      {{ props.playerStats.people[mostFrequentCoop][4] - props.playerStats.people[mostFrequentCoop][2] - props.playerStats.people[mostFrequentCoop][0] }}
                      <i
                        class="pi pi-info-circle"
                        style="margin-left: 5px"
                      />
                    </div>
                    <PlayerWithPicture
                      :username="mostFrequentCoop"
                      :name-first="false"
                    />
                  </td>
                </tr>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.bestCoop') + ':' }}</th>
                  <td>{{ props.playerStats.bestCoop }}</td>
                </tr>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.worstCoop') + ':' }}</th>
                  <td>{{ props.playerStats.worstCoop }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="slotProps.data === 'actions'">
            <table class="carousel-element">
              <tbody>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.nMoves') + ':' }}</th>
                  <td>{{ props.playerStats.nMoves }}</td>
                </tr>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.timePlayed') + ':' }}</th>
                  <td>
                    {{ Math.floor((props.playerStats?.timePlayed ?? 0) / 3600) }}:{{
                      String(Math.floor(((props.playerStats?.timePlayed ?? 0) % 3600) / 60)).padStart(2, '0')
                    }}h
                  </td>
                </tr>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.nAussetzen') + ':' }}</th>
                  <td>{{ props.playerStats.nAussetzen }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="slotProps.data === 'balls'">
            <table class="carousel-element">
              <tbody>
                <tr class="table-4-split-height">
                  <th>{{ t('Profile.ballsInOwnTeam') + ':' }}</th>
                  <td>{{ props.playerStats.ballsInOwnTeam }}</td>
                </tr>
                <tr class="table-4-split-height">
                  <th>{{ t('Profile.ballsInEnemy') + ':' }}</th>
                  <td>{{ props.playerStats.ballsInEnemy }}</td>
                </tr>
                <tr class="table-4-split-height">
                  <th>{{ t('Profile.nBallsLost') + ':' }}</th>
                  <td>{{ props.playerStats.nBallsLost }}</td>
                </tr>
                <tr class="table-4-split-height">
                  <th>{{ t('Profile.nBallsKickedEnemy') + ':' }}</th>
                  <td>{{ props.playerStats.nBallsKickedEnemy }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="slotProps.data === 'oopsies'">
            <table class="carousel-element">
              <tbody>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.nBallsKickedSelf') + ':' }}</th>
                  <td>{{ props.playerStats.nBallsKickedSelf }}</td>
                </tr>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.nBallsKickedOwnTeam') + ':' }}</th>
                  <td>{{ props.playerStats.nBallsKickedOwnTeam }}</td>
                </tr>
                <tr class="table-3-split-height">
                  <th>{{ t('Profile.nAbgeworfen') + ':' }}</th>
                  <td>{{ props.playerStats.nAbgeworfen }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </Carousel>
    </div>

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
      />
    </div>

    <Popover ref="popover">
      <div v-if="popoverUsername != null && popoverStats != null">
        <StatsWithPlayer
          :username="popoverUsername"
          :username-to-commpare-to="props.username"
          :win-rate-of-compare-user="props.playerStats.table[0]"
          :stats="popoverStats"
        />
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import ProfileRadar from '@/components/ProfileRadar.vue'
import UserGamesDougnut from '@/components/UserGamesDougnut.vue'
import type { PlayerFrontendStatistic } from '@/generatedClient'
import { useI18n } from 'vue-i18n'
import GamesHistoryBadge from '@/components/icons/GamesHistoryBadge.vue'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'
import Carousel from 'primevue/carousel'
import Popover from 'primevue/popover'
import { ref, useTemplateRef, nextTick } from 'vue'
import StatsWithPlayer from '@/components/StatsWithPlayer.vue'
import _ from 'lodash'

const { t } = useI18n()
const props = defineProps<{ username: string; playerStats: PlayerFrontendStatistic; myStats: PlayerFrontendStatistic }>()

const carouselOptions = ['games', 'winshares', 'streaks', 'coop', 'actions', 'balls', 'oopsies']

// Get the biggest element e[0] in props.playersStats.players
const mostFrequent = Object.keys(props.playerStats.people).reduce((prevKey, currentKey) => {
  return props.playerStats.people[currentKey][0] > props.playerStats.people[prevKey][0] ? currentKey : prevKey
})
const bestTeammate = Object.keys(props.playerStats.people).reduce((prevKey, currentKey) => {
  return props.playerStats.people[currentKey][1] > props.playerStats.people[prevKey][1] ? currentKey : prevKey
})
const bestTeammateByShare = Object.keys(props.playerStats.people)
  .filter((key) => props.playerStats.people[key][0] >= 5)
  .reduce((prevKey, currentKey) => {
    return props.playerStats.people[currentKey][1] / (props.playerStats.people[currentKey][0] || Number.MAX_SAFE_INTEGER) >
      props.playerStats.people[prevKey][1] / (props.playerStats.people[prevKey][0] || Number.MAX_SAFE_INTEGER)
      ? currentKey
      : prevKey
  })
const worstEnemy = Object.keys(props.playerStats.people).reduce((prevKey, currentKey) => {
  return props.playerStats.people[currentKey][2] - props.playerStats.people[currentKey][3] > props.playerStats.people[prevKey][2] - props.playerStats.people[prevKey][3]
    ? currentKey
    : prevKey
})
const worstEnemyByShare = Object.keys(props.playerStats.people)
  .filter((key) => props.playerStats.people[key][2] >= 5)
  .reduce((prevKey, currentKey) => {
    return (props.playerStats.people[currentKey][2] - props.playerStats.people[currentKey][3]) / (props.playerStats.people[currentKey][2] || Number.MAX_SAFE_INTEGER) >
      (props.playerStats.people[prevKey][2] - props.playerStats.people[prevKey][3]) / (props.playerStats.people[prevKey][2] || Number.MAX_SAFE_INTEGER)
      ? currentKey
      : prevKey
  })
const mostFrequentCoop = Object.keys(props.playerStats.people).reduce((prevKey, currentKey) => {
  return props.playerStats.people[currentKey][4] - props.playerStats.people[currentKey][2] - props.playerStats.people[currentKey][0] >
    props.playerStats.people[prevKey][4] - props.playerStats.people[prevKey][2] - props.playerStats.people[prevKey][0]
    ? currentKey
    : prevKey
})

const popover = useTemplateRef('popover')
const popoverUsername = ref<string>()
const popoverStats = ref<number[]>()

const showPopover = (event: any, username: string) => {
  popover.value?.hide()

  const stats = props.playerStats.people[username]

  if (username != null && username !== '' && stats != null && username !== popoverUsername.value) {
    popoverUsername.value = username
    popoverStats.value = stats

    nextTick(() => {
      popover.value?.show(event)
    })
  } else {
    popoverUsername.value = undefined
    popoverStats.value = undefined
  }
}

function calculateStreaks(history: typeof props.playerStats.history) {
  let longestWinningStreakTemp = 0
  let longestWinningStreak = 0
  let longestLosingStreakTemp = 0
  let longestLosingStreak = 0
  for (const game of history) {
    if (game === 'r' || game === 'c') continue

    if (game === 'w') {
      longestWinningStreakTemp++
      longestWinningStreak = Math.max(longestWinningStreak, longestWinningStreakTemp)
      longestLosingStreakTemp = 0
    } else {
      longestLosingStreakTemp++
      longestLosingStreak = Math.max(longestLosingStreak, longestLosingStreakTemp)
      longestWinningStreakTemp = 0
    }
  }

  let currentWinningStreak = 0
  for (const game of history.toReversed()) {
    if (game === 'r' || game === 'c') continue

    if (game === 'w') {
      currentWinningStreak++
    } else {
      break
    }
  }

  let currentLosingStreak = 0
  for (const game of history.toReversed()) {
    if (game === 'r' || game === 'c') continue

    if (game != 'w') {
      currentLosingStreak++
    } else {
      break
    }
  }

  return [longestWinningStreak, longestLosingStreak, currentLosingStreak > 0 ? -1 * currentLosingStreak : currentWinningStreak]
}
const [longestWinningStreak, longestLosingStreak, currentStreak] = calculateStreaks(props.playerStats.history)
</script>

<style scoped>
.carousel-element {
  display: flex;
  justify-content: center;
  margin: 10px;
  padding: 5px;
  background-color: var(--background-contraster);
  border-radius: 10px;
  overflow: hidden;
}

.table-3-split-height {
  height: 32px;
}

.table-4-split-height {
  height: 23px;
}

.games-with {
  display: flex;
  align-items: center;
}

.games-with-number {
  width: 65px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-right: 10px;
}

.history-badge-stack-number {
  width: 30px;
}

.history-badge-stack {
  display: flex;
  align-items: center;
}

.history-badge-stack > * {
  margin-right: -12px;
  box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.3);
}

.chartNextToEachOtherContainer {
  display: grid;
  grid-template-columns: 50% 50%;
}

@media (max-width: 570px) {
  .chartNextToEachOtherContainer {
    grid-template-columns: 1fr;
  }
}

.chartNextToEachOther {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
