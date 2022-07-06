<template>
  <h2>{{ $t("Landing.Tournament.title") }}</h2>
  <div
    v-if="tournament != null"
    class="clickable"
    @click="() => { if (tournament?.id != null) { $router.push({ name: 'PublicTournament', params: { id: tournament.id } }) } }"
  >
    <div class="TournamentHeading">{{ tournament.title }}:</div>
    <TournamentStatusBadge :status="tournament.status" />
    <TournamentTimer
      v-if="tournament.status !== 'signUpFailed'"
      :tournament="tournament"
      style="margin-top: 15px"
    />
  </div>
  <div v-if="tournament == null">{{ $t("Landing.Tournament.noActiveTournament") }}</div>
  <div class="LastWinnersHeading">{{ $t("Landing.Tournament.lastWinners") }}</div>
  <div
    v-for="team in winners"
    :key="`LandingWinnersTeam-${team.teamName}`"
    class="bracket-match-team"
  >
    <div class="bracket-match-team-tag">{{ team.teamName }}</div>
    <div class="bracket-match-team-body">
      <div style="flex: 0 0 4rem; margin-right: 15px">
        <Crown :rank="team.placement" />
      </div>
      <div class="bracket-match-team-players">
        <PlayerWithPicture
          v-for="p in team.players"
          :key="`LandingWinnersTeam-${team.teamName}-player-${p}`"
          :username="p"
          :nameFirst="false"
          :showCrown="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TournamentStatusBadge from '@/components/Tournament/TournamentStatusBadge.vue';
import TournamentTimer from '@/components/Tournament/TournamentTimer.vue';
import PlayerWithPicture from '@/components/PlayerWithPicture.vue';
import Crown from '@/components/icons/CrownSymbol.vue';

import type { publicTournament } from '@/../../shared/types/typesTournament';
import { ref, onUnmounted } from 'vue';
import { injectStrict, SocketKey } from '@/services/injections';
import { getWinners } from '@/services/useTournamentWinners';

const socket = injectStrict(SocketKey)

const winners = getWinners()
const tournament = ref<publicTournament | null>(null)

queryTournament()
async function queryTournament() {
  const res = await socket.emitWithAck(5000, 'tournament:public:get-current')
  if (res.data == null) { console.error('Could not query current Tournament'); return }
  tournament.value = res.data
}

function updateTournament(newTournament: publicTournament) {
  if (tournament.value?.id === newTournament.id) { tournament.value = newTournament }
}

socket.on('tournament:public:update', updateTournament)
onUnmounted(() => { socket.off('tournament:public:update', updateTournament) })
</script>

<style scoped>
.bracket-match-team {
  margin: 10px 0px;
}

.bracket-match-team-tag {
  font-weight: bold;
  text-align: left;
  font-size: 0.6rem;
}

.bracket-match-team-body {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background: var(--surface-d);
  border-radius: 5px;
  padding: 5px;
  overflow: hidden;
}

.bracket-match-team-players {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
}
.TournamentHeading {
  font-weight: bold;
  margin-bottom: 5px;
}
.LastWinnersHeading {
  margin-top: 10px;
  font-weight: bold;
}
</style>
