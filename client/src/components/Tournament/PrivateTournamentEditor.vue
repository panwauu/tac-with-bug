<template>
  <h2>{{ t('Tournament.EditPrivate.header') }}</h2>
  <div style="display: flex; flex-direction: column; align-items: center">
    <div
      v-for="team in tournament.registerTeams"
      :key="`teams-${team.name}`"
      class="team"
    >
      <div class="teamName">{{ team.name }}</div>
      <div
        v-for="(player, playerIndex) in team.players"
        :key="`team-${team.name}-${player}`"
        class="player"
      >
        <PlayerWithPicture
          :username="player"
          :name-first="false"
          :class="{ unactivatedPlayer: !team.activated[playerIndex] }"
        />
        <div>
          <Button
            v-if="player === username && !team.activated[playerIndex]"
            icon="pi pi-check"
            text
            rounded
            severity="success"
            @click="activatePlayer()"
          />
          <Button
            v-if="tournament.adminPlayer === username || player === username"
            icon="pi pi-times"
            text
            rounded
            severity="danger"
            @click="removePlayer(player)"
          />
        </div>
      </div>
      <Button
        v-if="team.players.length < tournament.playersPerTeam && tournament.adminPlayer === username"
        type="button"
        icon="pi pi-plus"
        @click="open(team.name)"
      />
      <div v-if="team.players.length < tournament.playersPerTeam && tournament.adminPlayer !== username">...</div>
    </div>
    <Button
      v-if="tournament.registerTeams.length < tournament.nTeams && tournament.adminPlayer === username"
      type="button"
      icon="pi pi-plus"
      :label="t('Tournament.EditPrivate.addTeamButton')"
      @click="open()"
    />
    <div v-if="tournament.registerTeams.length < tournament.nTeams && tournament.adminPlayer !== username">...</div>
    <Message
      v-if="!readyToStart"
      severity="error"
      icon="pi pi-times-circle"
    >
      {{ t('Tournament.EditPrivate.notCompleteMessage') }}
    </Message>
    <Button
      v-if="tournament.adminPlayer === username"
      :disabled="!readyToStart"
      :label="t('Tournament.EditPrivate.startButton')"
      icon="pi pi-play"
      class=""
      @click="startTournament"
    />
    <PrivateTournamentEditorDialog
      v-model:visible="showDialog"
      :tournament="tournament"
      :prop-team-name="diaglogTeamName"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Message from 'primevue/message'
import PlayerWithPicture from '../PlayerWithPicture.vue'
import PrivateTournamentEditorDialog from './PrivateTournamentEditorDialog.vue'

import { ref, computed } from 'vue'
import { injectStrict, SocketKey } from '@/services/injections'
import type { PrivateTournament } from '@/../../server/src/sharedTypes/typesTournament'
import { username } from '@/services/useUser'
import { useToast } from 'primevue/usetoast'
const toast = useToast()

const props = defineProps<{ tournament: PrivateTournament }>()

const socket = injectStrict(SocketKey)

const showDialog = ref(false)
const diaglogTeamName = ref<string | null>(null)

function open(teamName?: string) {
  diaglogTeamName.value = teamName ?? null
  showDialog.value = true
}

const readyToStart = computed(() => {
  return (
    props.tournament.registerTeams.length === props.tournament.nTeams &&
    !props.tournament.registerTeams.some((team) => team.players.length !== props.tournament.playersPerTeam || team.activated.some((a) => !a))
  )
})

async function activatePlayer() {
  const res = await socket.emitWithAck(1000, 'tournament:private:acceptParticipation', { tournamentID: props.tournament.id })
  if (res.error != null) {
    console.error(res.error)
    toast.add({
      severity: 'error',
      detail: t('Toast.GenericError.detail'),
      summary: t('Toast.GenericError.summary'),
      life: 10000,
    })
  }
}

async function removePlayer(usernameToRemove: string) {
  if (username.value === props.tournament.adminPlayer) {
    const res = await socket.emitWithAck(1000, 'tournament:private:planRemovePlayer', { tournamentID: props.tournament.id, usernameToRemove })
    if (res.error != null) {
      console.error(res.error)
      toast.add({
        severity: 'error',
        detail: t('Toast.GenericError.detail'),
        summary: t('Toast.GenericError.summary'),
        life: 10000,
      })
      return
    }
  } else {
    const res = await socket.emitWithAck(1000, 'tournament:private:declineParticipation', { tournamentID: props.tournament.id })
    if (res.error != null) {
      console.error(res.error)
      toast.add({
        severity: 'error',
        detail: t('Toast.GenericError.detail'),
        summary: t('Toast.GenericError.summary'),
        life: 10000,
      })
      return
    }
  }
}

async function startTournament() {
  const res = await socket.emitWithAck(1000, 'tournament:private:start', { tournamentID: props.tournament.id })
  if (res.error != null) {
    console.error(res.error)
    toast.add({
      severity: 'error',
      detail: t('Toast.GenericError.detail'),
      summary: t('Toast.GenericError.summary'),
      life: 10000,
    })
  }
}
</script>

<style scoped>
.team {
  background: var(--background-contrastest);
  border-radius: 10px;
  padding: 10px;
  position: relative;
  margin: 25px 10px 10px 10px;
}

.teamName {
  position: absolute;
  top: -15px;
  left: 10px;
  font-size: small;
  font-weight: bold;
}

.player {
  display: flex;
  justify-content: space-between;
}

.unactivatedPlayer {
  color: #ffe082;
  text-decoration-line: underline;
  text-decoration-style: dashed;
}
</style>
