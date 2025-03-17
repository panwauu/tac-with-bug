<template>
  <Dialog
    ref="adaptTeamDialog"
    v-model:visible="localVisible"
    :modal="true"
    :dismissable-mask="true"
    :close-on-escape="true"
    :header="props.propTeamName != null ? 'Spieler zu Team hinzufügen' : 'Neues Team anlegen'"
    append-to="body"
    :show-close-icon="true"
    :breakpoints="{ '640px': '100vw' }"
    :style="{ width: '450px' }"
  >
    <div style="display: flex; flex-direction: column">
      <TeamName
        v-model:teamname="teamName"
        v-model:valid="validTeamName"
        class="element inputElement"
        :disabled="props.propTeamName != null"
        :existing-team-names="existingTeamNames"
      />
      <PlayersAutoComplete
        v-model:username="playerName"
        :userid="-1"
        class="element inputElement"
        :players-to-avoid="playersAlreadyInTournament"
      />
      <Button
        class="element"
        icon="pi pi-user-plus"
        :label="props.propTeamName != null ? 'Spieler hinzufügen' : 'Team anlegen'"
        :disabled="!(validTeamName || props.propTeamName != null) || playerName == null || settingsStore.isBlockedByModeration"
        @click="submitNewTeam"
      />
      <BlockedByModerationMessage
        v-if="settingsStore.isBlockedByModeration"
        :blocked-by-moderation-until="settingsStore.blockedByModerationUntil ?? ''"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import TeamName from '../Forms/TeamName.vue'
import PlayersAutoComplete from '../PlayersAutoComplete.vue'

import { ref, computed, watch } from 'vue'
import { injectStrict, SocketKey } from '@/services/injections'
import type { PrivateTournament } from '@/../../server/src/sharedTypes/typesTournament'
import { useSettingsStore } from '@/store/settings'
import BlockedByModerationMessage from '../BlockedByModerationMessage.vue'

const props = defineProps<{ tournament: PrivateTournament; visible: boolean; propTeamName: string | null }>()
const emit = defineEmits<{ 'update:visible': [visible: boolean] }>()
const settingsStore = useSettingsStore()

watch(
  () => [props.visible, props.tournament],
  () => {
    resetOverlayPanel()
  },
  { deep: true }
)
watch(
  () => props.propTeamName,
  () => {
    teamName.value = props.propTeamName ?? ''
  }
)

const socket = injectStrict(SocketKey)

const localVisible = computed({
  set: (value: boolean) => {
    emit('update:visible', value)
  },
  get: () => props.visible,
})

const adaptTeamDialog = ref<Dialog | null>()
const teamName = ref('')
const validTeamName = ref(false)
const playerName = ref<string | null>(null)

function resetOverlayPanel() {
  validTeamName.value = false
  teamName.value = props.propTeamName ?? ''
  playerName.value = null
}

async function submitNewTeam() {
  if (playerName.value == null) {
    console.error('No Player Selected')
    return
  }
  const res = await socket.emitWithAck(1000, 'tournament:private:planAddPlayer', {
    tournamentID: props.tournament.id,
    usernameToAdd: playerName.value,
    teamTitle: teamName.value,
  })
  if (res.data == null) {
    console.error('Error in New Team Submission', res.error)
  }
  localVisible.value = false
  resetOverlayPanel()
}

const playersAlreadyInTournament = computed(() => {
  const result: string[] = []
  props.tournament.teams.forEach((t) => {
    t.players.forEach((p) => {
      result.push(p)
    })
  })
  props.tournament.registerTeams.forEach((t) => {
    t.players.forEach((p) => {
      result.push(p)
    })
  })
  return result
})

const existingTeamNames = computed(() => {
  return [...props.tournament.teams.map((t) => t.name), ...props.tournament.registerTeams.map((r) => r.name)]
})
</script>

<style scoped>
.element {
  margin-top: 20px;
}

.inputElement {
  width: 100%;
}
</style>
