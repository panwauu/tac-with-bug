<template>
  <div
    v-if="tournament.status === 'signUp'"
    class="signUpWrapper"
  >
    <div class="signUpList">
      <h3>{{ t('Tournament.registrationList', { x: openTeams }) }}:</h3>
      <TournamentTeam
        v-if="ownTeam != null"
        :tournament="tournament"
        :team="ownTeam"
      />
      <h5 style="margin-top: 0">{{ t('Tournament.otherTeams') }}</h5>
      <TournamentTeam
        v-for="team in otherTeams"
        :key="`registerTeams-${team.name}`"
        :tournament="tournament"
        :team="team"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import TournamentTeam from '@/components/Tournament/TournamentTeam.vue'

import type { PublicTournament } from '@/../../server/src/sharedTypes/typesTournament'
import { computed } from 'vue'
import { username } from '@/services/useUser'

const props = defineProps<{ tournament: PublicTournament }>()

const ownTeam = computed(() => {
  return props.tournament.registerTeams.find((team) => username.value != null && team.players.includes(username.value))
})
const otherTeams = computed(() => {
  return props.tournament.registerTeams.filter((team) => username.value === null || !team.players.includes(username.value))
})
const openTeams = computed(() => {
  return (
    props.tournament.nTeams - props.tournament.registerTeams.filter((team) => team.activated.every((a) => a) && team.players.length === props.tournament.playersPerTeam).length
  )
})
</script>

<style scoped>
.signUpWrapper {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}

.signUpList {
  margin: 10px;
}
</style>
