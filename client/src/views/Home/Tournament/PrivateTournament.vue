<template>
  <div v-if="tournament == null">
    <ProgressSpinner />
  </div>
  <div v-else class="privateTournament">
    <Button
      icon="pi pi-question"
      class="p-button-rounded p-button-sm p-button-text p-button-secondary buttonExplanation"
      @click="displayExplanation = true"
    />

    <h3>{{ tournament.title }}:</h3>
    <TournamentStatusBadge :status="tournament.status" />
    <table class="tournamentInfoTable">
      <tr>
        <td>{{ $t('Tournament.Private.admin') }}</td>
        <td>
          <PlayerWithPicture :username="tournament.adminPlayer" :nameFirst="true" />
        </td>
      </tr>
      <tr>
        <td>{{ $t('Tournament.Private.playersPerGame') }}</td>
        <td>{{ tournament.playersPerTeam }}</td>
      </tr>
      <tr>
        <td>{{ $t('Tournament.Private.teamsPerGame') }}</td>
        <td>{{ tournament.teamsPerMatch }}</td>
      </tr>
      <tr>
        <td>{{ $t('Tournament.Private.playersPerTournament') }}</td>
        <td>{{ tournament.nTeams }}</td>
      </tr>
    </table>
    <Button
      v-if="tournament.adminPlayer === username && ['planned', 'running'].includes(tournament.status)"
      icon="pi pi-times"
      :label="$t('Tournament.Private.abortButton')"
      class="p-button-warning"
      @click="abortTournament"
    />
    <div v-if="tournament.status === 'planned'">
      <PrivateTournamentEditor :tournament="tournament" />
    </div>
    <TournamentBracket
      v-if="tournament.status !== 'planned' && tournament.teams.length > 0"
      :tournament="tournament"
    />
    <div v-if="tournament.status === 'aborted' && tournament.teams.length === 0">
      <h4>{{ $t('Tournament.Private.abortedPlayersList') }}</h4>
      <PlayerWithPicture
        v-for="registeredUsername in tournament.registerTeams.map((t) => t.players).flat()"
        :key="`Player-${registeredUsername}`"
        :username="registeredUsername"
        :nameFirst="false"
      />
    </div>

    <Dialog
      v-model:visible="displayExplanation"
      :header="$t('Tournament.helpModal.title')"
      :modal="true"
      :dismissableMask="true"
    >
      <h3>{{ $t("Tournament.Private.HelpModal.privateHeader") }}</h3>
      <p>{{ $t("Tournament.Private.HelpModal.privateContent") }}</p>
      <h3>{{ $t("Tournament.Private.HelpModal.planningHeader") }}</h3>
      <TournamentStatusBadge status="planned" />
      <p>{{ $t("Tournament.Private.HelpModal.planningContent") }}</p>
      <h3>{{ $t("Tournament.Private.HelpModal.runningHeader") }}</h3>
      <TournamentStatusBadge status="running" />
      <p>{{ $t("Tournament.Private.HelpModal.runningContent") }}</p>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Dialog from 'primevue/dialog';
import TournamentBracket from '@/components/Tournament/TournamentBracket.vue';
import PrivateTournamentEditor from '@/components/Tournament/PrivateTournamentEditor.vue';
import PlayerWithPicture from '@/components/PlayerWithPicture.vue';
import TournamentStatusBadge from '@/components/Tournament/TournamentStatusBadge.vue';

import type { privateTournament } from '@/../../../shared/types/typesTournament';
import { ref, computed, watch, onUnmounted } from 'vue';
import { injectStrict, SocketKey } from '@/services/injections';
import router from '@/router';
import { useToast } from 'primevue/usetoast';
import { i18n } from '@/services/i18n';
import { username } from '@/services/useUser';

const props = defineProps<{ id: string, locale: string }>()

const socket = injectStrict(SocketKey);
const tournamentID = computed(() => parseInt(props.id))
let tournament = ref<privateTournament | null>()
const toast = useToast()

async function abortTournament() {
  if (tournament.value == null) { return }

  if (confirm(i18n.global.t('Tournament.Private.confirmAbort'))) {
    const res = await socket.emitWithAck(1000, 'tournament:private:abort', { tournamentID: tournament.value.id })
    if (res.error != null) {
      console.error(res.error)
      toast.add({
        severity: 'error',
        detail: i18n.global.t('Toast.GenericError.detail'),
        summary: i18n.global.t('Toast.GenericError.summary'),
        life: 10000
      })
    }
  }
}

queryTournament()
watch(() => props.id, () => queryTournament)
async function queryTournament() {
  const res = await socket.emitWithAck(5000, 'tournament:private:get', { id: tournamentID.value })
  if (res.data == null) { console.error('Could not query Tournament'); router.push({ name: 'TournamentOverview' }); return }
  tournament.value = res.data
}

function updateTournament(newTournament: privateTournament) {
  if (tournament.value?.id === newTournament.id) { tournament.value = newTournament }
}

socket.on('tournament:private:update', updateTournament)
onUnmounted(() => { socket.off('tournament:private:update', updateTournament) })

let displayExplanation = ref(false)
</script>

<style scoped>
.privateTournament {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.tournamentInfoTable {
  margin: 20px;
}

table,
th,
td {
  border: 1px solid var(--surface-d);
  border-collapse: collapse;
  padding: 10px 25px;
}

.buttonExplanation {
  position: absolute;
  right: 5px;
  top: 5px;
}
</style>
