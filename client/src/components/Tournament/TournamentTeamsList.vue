<template>
  <div v-if="tournament.status === 'signUp'" class="signUpWrapper">
    <div class="signUpList">
      <h3>{{ $t("Tournament.registrationList", { x: openTeams }) }}:</h3>
      <TournamentTeam v-if="ownTeam != null" :tournament="tournament" :team="ownTeam" />
      <h5 style="margin-top: 0">{{ $t("Tournament.otherTeams") }}</h5>
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
import TournamentTeam from '@/components/Tournament/TournamentTeam.vue';

import { publicTournament } from '@/../../shared/types/typesTournament';
import { computed } from 'vue';
import { username } from '@/services/useUser';

const props = defineProps<{ tournament: publicTournament }>()

const ownTeam = computed(() => { return props.tournament.registerTeams.find((t) => username.value != null && t.players.includes(username.value)) })
const otherTeams = computed(() => { return props.tournament.registerTeams.filter((t) => username.value === null || !t.players.includes(username.value)) })
const openTeams = computed(() => { return props.tournament.nTeams - props.tournament.registerTeams.filter((t) => t.activated.every((a) => a) && t.players.length === props.tournament.playersPerTeam).length })
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