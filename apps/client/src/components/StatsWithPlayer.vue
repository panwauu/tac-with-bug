<template>
  <div>
    <PlayerWithPicture
      :username="username"
      :name-first="false"
    />
    <div class="playerCardElement">
      {{
        t('Profile.NetworkGraph.togetherWith', {
          username: username,
          nGames: stats[0],
          count: stats[0],
        })
      }}
    </div>
    <div
      class="playerCardElement"
      style="padding-left: 10px"
    >
      {{
        t('Profile.NetworkGraph.wonOf', {
          nGames: stats[1],
          count: stats[1],
        })
      }}
    </div>
    <div class="playerCardElement">
      {{
        t('Profile.NetworkGraph.playedAgainst', {
          username: username,
          nGames: stats[2],
          count: stats[2],
        })
      }}
    </div>
    <div
      class="playerCardElement"
      style="padding-left: 10px"
    >
      {{
        t('Profile.NetworkGraph.wonOf', {
          nGames: stats[2] - stats[3],
          count: stats[2] - stats[3],
        })
      }}
    </div>
    <div class="playerCardElement">
      {{
        t('Profile.NetworkGraph.team', {
          nGames: stats[4] - stats[2] - stats[0],
          count: stats[4] - stats[2] - stats[0],
        })
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayerWithPicture from './PlayerWithPicture.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
defineProps<{
  username: string
  stats: number[]
}>()
</script>

<style scoped>
.playerCardElement {
  white-space: nowrap;
}
</style>
