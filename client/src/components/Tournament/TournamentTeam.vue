<template>
  <div class="team">
    <div class="teamTag">{{ team.name }}</div>
    <div
      :class="['teamBody', teamActivated(team) || alreadyRegistered ? '' : 'clickable']"
      @click="joinTeam(team, tournament.id)"
    >
      <div
        v-for="(player, i) in team.players"
        :key="`registerTeams-${team.name}-${player}`"
        :style="`margin-right: ${i === 0 ? '20' : '0'}px`"
      >
        <PlayerWithPicture
          :name-first="false"
          :username="player"
          :class="[team.activated[i] ? '' : 'notActivatedPlayer']"
          :clickable="teamActivated(team) || alreadyRegistered"
        />
        <Button
          v-if="player === username && team.activated[i] === false"
          icon="pi pi-check"
          class="p-button-rounded p-button-success p-button-text"
          @click="activateUser()"
        />
        <Button
          v-if="player === username"
          icon="pi pi-times"
          class="p-button-rounded p-button-danger p-button-text"
          @click="leaveTournament()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'

import type { PublicTournament, RegisterTeam } from '@/../../server/src/sharedTypes/typesTournament'
import { computed } from 'vue'
import { injectStrict, SocketKey } from '@/services/injections'
import { username } from '@/services/useUser'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const socket = injectStrict(SocketKey)
const props = defineProps<{ tournament: PublicTournament; team: RegisterTeam }>()

function teamActivated(team: RegisterTeam) {
  return team.players.some((_, i) => team.activated[i] === false)
}

const alreadyRegistered = computed(() => {
  return (
    props.tournament.teams.some((team) => username.value != null && team.players.includes(username.value)) ||
    props.tournament.registerTeams.some((team) => username.value != null && team.players.includes(username.value))
  )
})

function joinTeam(team: RegisterTeam, tournamentID: number) {
  if (!(teamActivated(team) || alreadyRegistered.value) && confirm(t('Tournament.signUpConfirmationText'))) {
    socket.emitWithAck(5000, 'tournament:public:joinTeam', {
      tournamentID: tournamentID,
      teamName: team.name,
    })
  }
}

function leaveTournament() {
  socket.emitWithAck(5000, 'tournament:public:leaveTournament', { tournamentID: props.tournament.id })
}

function activateUser() {
  if (confirm(t('Tournament.signUpConfirmationText'))) {
    socket.emitWithAck(5000, 'tournament:public:activateUser', { tournamentID: props.tournament.id })
  }
}
</script>

<style scoped>
.team {
  margin: 20px;
}

.teamTag {
  font-weight: bold;
  text-align: left;
  font-size: 0.6rem;
}

.teamBody {
  background: var(--background-contrastest);
  border-radius: 5px;
  padding: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notActivatedPlayer {
  color: #ffe082;
  text-decoration-line: underline;
  text-decoration-style: dashed;
}
</style>
