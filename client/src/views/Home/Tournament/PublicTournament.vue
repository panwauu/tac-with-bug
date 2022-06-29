<template>
  <div class="publicTournamentPage">
    <Button
      icon="pi pi-question"
      class="p-button-rounded p-button-sm p-button-text p-button-secondary buttonExplanation"
      @click="displayExplanation = true"
    />

    <div v-if="tournament == null">
      <ProgressSpinner />
    </div>
    <div v-else>
      <h3>{{ tournament.title }}:</h3>
      <TournamentStatusBadge :status="tournament.status" />
      <TournamentTimer :tournament="tournament" style="margin: 20px" />
      <TournamentTimeTable :tournament="tournament" />
      <TournamentSignUp :tournament="tournament" />
      <TournamentTeamsList :tournament="tournament" />
      <TournamentBracket
        v-if="
          tournament.status === 'signUpEnded' ||
            tournament.status === 'running' ||
            tournament.status === 'ended'
        "
        :tournament="tournament"
      />
    </div>

    <Dialog
      v-model:visible="displayExplanation"
      :header="$t('Tournament.helpModal.title')"
      :modal="true"
      :dismissableMask="true"
    >
      <h3>{{ $t("Tournament.helpModal.signUpHeader") }}</h3>
      <p>{{ $t("Tournament.helpModal.signUpContent") }}</p>
      <h3>{{ $t("Tournament.helpModal.gameTimeHeader") }}</h3>
      <p>{{ $t("Tournament.helpModal.gameTimeContent") }}</p>
      <h3>{{ $t("Tournament.helpModal.tournamentProcessHeader") }}</h3>
      <p>{{ $t("Tournament.helpModal.tournamentProcessContent") }}</p>
      <h3>{{ $t("Tournament.helpModal.winnerHeader") }}</h3>
      <p>{{ $t("Tournament.helpModal.winnerContent") }}</p>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import TournamentStatusBadge from '@/components/Tournament/TournamentStatusBadge.vue';
import TournamentTimer from '@/components/Tournament/TournamentTimer.vue';
import TournamentTimeTable from '@/components/Tournament/TournamentTimeTable.vue';
import TournamentTeamsList from '@/components/Tournament/TournamentTeamsList.vue';
import TournamentSignUp from '@/components/Tournament/TournamentSignUp.vue';
import TournamentBracket from '@/components/Tournament/TournamentBracket.vue';

import type { publicTournament } from '@/../../../shared/types/typesTournament';
import { ref, computed, watch, onUnmounted } from 'vue';
import { injectStrict, SocketKey } from '@/services/injections';
import router from '@/router';

const props = defineProps<{ id: string, locale: string }>()

const socket = injectStrict(SocketKey);
const tournamentID = computed(() => parseInt(props.id))
let tournament = ref<publicTournament | null>()

queryTournament()
watch(() => props.id, () => queryTournament)
async function queryTournament() {
  const res = await socket.emitWithAck(5000, 'tournament:public:get', { id: tournamentID.value })
  if (res.data == null) { console.error('Could not query Tournament'); router.push({ name: 'TournamentOverview' }); return }
  tournament.value = res.data
}

function updateTournament(newTournament: publicTournament) {
  if (tournament.value?.id === newTournament.id) { tournament.value = newTournament }
}

socket.on('tournament:public:update', updateTournament)
onUnmounted(() => { socket.off('tournament:public:update', updateTournament) })

let displayExplanation = ref(false)
</script>

<style scoped>
.publicTournamentPage {
  position: relative;
}

.buttonExplanation {
  position: absolute;
  right: 5px;
  top: 5px;
}
</style>
