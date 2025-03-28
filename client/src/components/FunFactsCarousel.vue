<template>
  <Carousel
    :value="funfactsForCarousel"
    :circular="true"
    style="max-width: 100%; margin: 20px 0px"
  >
    <template #item="slotProps">
      <div>
        <div
          class="carousel-element"
          :class="{ 'p-card': usePCardStyle, 'custom-card': !usePCardStyle }"
        >
          <table :aria-label="t('Advertisement.FunFacts.tableDescription')">
            <tr
              v-for="fact in Object.entries(slotProps.data)"
              :key="`Funfact-${fact[0]}`"
            >
              <th style="padding-right: 10px">{{ t(`Advertisement.FunFacts.${fact[0]}`) }}</th>
              <td v-if="fact[0] === 'mostLoved' || fact[0] === 'leastLoved'">
                <BallsImage
                  style="height: 30px"
                  :color="fact[1] as string"
                />
              </td>
              <td v-else>{{ fact[1] }}</td>
            </tr>
          </table>
        </div>
      </div>
    </template>
  </Carousel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Carousel from 'primevue/carousel'
import { reactive, computed } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import BallsImage from './assets/BallsImage.vue'

withDefaults(defineProps<{ usePCardStyle?: boolean }>(), { usePCardStyle: true })

const funfacts = reactive({
  gamesAndUsers: {
    nGames4: 0,
    nGames6: 0,
    nGamesTeam: 0,
    registeredUsers: 0,
  },
  gameDurations: {
    fastestGame: '0:00:00',
    longestGame: '0:00:00',
    averagePlayingTime: '0:00:00',
  },
  teamStats: {
    bestTeamGame: 0,
    worstTeamGame: 0,
    averageTeamGame: 0,
  },
  colors: {
    mostLoved: 'red',
    leastLoved: 'blue',
    nColorBlinds: 0,
  },
  misc: {
    nFriends: 0,
    nTutorials: 0,
  },
})

Service.getPlatformFunFacts()
  .then((res) => {
    funfacts.gamesAndUsers.nGames4 = res.nGames4
    funfacts.gamesAndUsers.nGames6 = res.nGames6
    funfacts.gamesAndUsers.nGamesTeam = res.nGamesTeam
    funfacts.gamesAndUsers.registeredUsers = res.registeredUsers
    funfacts.gameDurations.fastestGame = getIntervalString(res.fastestGame)
    funfacts.gameDurations.longestGame = getIntervalString(res.longestGame)
    funfacts.gameDurations.averagePlayingTime = getIntervalString(res.averagePlayingTime)
    funfacts.teamStats.bestTeamGame = res.bestTeamGame
    funfacts.teamStats.worstTeamGame = res.worstTeamGame
    funfacts.teamStats.averageTeamGame = res.averageTeamGame
    funfacts.misc.nFriends = res.nFriends
    funfacts.misc.nTutorials = res.nTutorials
    funfacts.colors.mostLoved = res.colors[0]
    funfacts.colors.leastLoved = res.colors[res.colors.length - 1]
    funfacts.colors.nColorBlinds = res.nColorBlind
  })
  .catch((err) => console.log(err))

function getIntervalString(seconds: number) {
  const s = Math.floor(seconds % 60)
  const m = Math.floor(((seconds - s) / 60) % 60)
  const h = Math.floor((seconds - s - m * 60) / 3600)
  return `${h.toString()}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const funfactsForCarousel = computed(() => {
  return Object.values(funfacts)
})
</script>

<style scoped>
.carousel-element {
  display: flex;
  justify-content: center;
  margin: 3px;
  padding: 5px;
}

.custom-card {
  background-color: var(--background-contraster);
  border-radius: 3px;
}
</style>
