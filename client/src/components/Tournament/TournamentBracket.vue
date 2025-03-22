<template>
  <div
    style="margin: 20px"
    class="bracketsContainer"
  >
    <template
      v-for="(list, listIndex) in tournament.data.brackets"
      :key="`bracket-${listIndex}`"
    >
      <div class="bracket">
        <h4>
          {{ t(`Tournament.Brackets.bracketList${tournament.data.brackets.length - 1 - Number(listIndex)}`) }}
        </h4>
        <div class="bracket-list-wrapper">
          <div
            v-if="listIndex === tournament.data.brackets.length - 1"
            class="bracket-connector-outer"
          >
            <div class="bracket-connector-inner">
              <div class="bracket-connector-1" />
              <div class="bracket-connector-2" />
            </div>
          </div>
          <div :class="['bracket-list', listIndex === tournament.data.brackets.length - 1 ? 'bracket-list-last' : '']">
            <div
              v-for="(match, matchIndex) in list"
              :key="`bracket-list-${String(listIndex)}-match-${String(matchIndex)}`"
              :class="['bracket-list-element', listIndex === tournament.data.brackets.length - 1 && matchIndex === 0 ? 'bracket-list-element-last' : '']"
            >
              <div
                v-if="listIndex !== 0 && listIndex !== tournament.data.brackets.length - 1"
                class="bracket-connector-outer"
              >
                <div class="bracket-connector-inner">
                  <div class="bracket-connector-1" />
                  <div class="bracket-connector-2" />
                </div>
              </div>
              <div class="bracket-match">
                <Button
                  v-if="match.gameID !== -1 && match.winner === -1"
                  icon="pi pi-eye"
                  :label="t('Game.toViewerButton')"
                  @click="
                    router.push({
                      name: 'Game',
                      query: {
                        gameID: match.gameID,
                        nPlayers: 4,
                      },
                    })
                  "
                />
                <div
                  v-if="listIndex === tournament.data.brackets.length - 1"
                  class="crown-container"
                >
                  <div
                    v-if="matchIndex === 0"
                    class="crown"
                  >
                    <Crown :rank="1" />
                  </div>
                  <div
                    v-if="matchIndex === 0"
                    class="crown"
                  >
                    <Crown :rank="2" />
                  </div>
                  <div
                    v-if="matchIndex === 1"
                    class="crown"
                  >
                    <Crown :rank="3" />
                  </div>
                </div>
                <div
                  v-for="(teamIndex, bracketTeamIndex) in match.teams"
                  :key="`bracket-list-${String(listIndex)}-match-${String(matchIndex)}-team-${teamIndex}`"
                  class="bracket-match-team"
                >
                  <div
                    v-if="teamIndex !== -1"
                    class="bracket-match-team-tag"
                  >
                    {{ tournament.teams[teamIndex]?.name ?? 'Missing' }}
                  </div>
                  <div
                    :class="[
                      'bracket-match-team-body',
                      match.winner === teamIndex && match.winner !== -1 ? 'bracket-match-team-body-won' : '',
                      match.winner !== teamIndex && match.winner !== -1 ? 'bracket-match-team-body-lost' : '',
                      match.winner === -1 && !match.teams.every((t) => t === -1) ? 'bracket-match-team-body-running' : '',
                    ]"
                  >
                    <div
                      v-if="teamIndex !== -1"
                      class="bracket-match-team-players"
                    >
                      <PlayerWithPicture
                        v-if="tournament.teams[teamIndex]?.players[0] != null"
                        :name-first="false"
                        :username="tournament.teams[teamIndex].players[0]"
                      />
                      <PlayerWithPicture
                        v-if="tournament.teams[teamIndex]?.players[1] != null"
                        :name-first="false"
                        :username="tournament.teams[teamIndex].players[1]"
                      />
                    </div>
                    <div
                      v-if="teamIndex !== -1 && match.gameID !== -1"
                      class="bracket-match-team-score"
                    >
                      {{ match.score[bracketTeamIndex] }}
                    </div>
                    <div
                      v-if="teamIndex === -1"
                      class="bracket-match-team-placeholder"
                    >
                      {{ t('Tournament.Brackets.bracketTBDTeam') }}
                    </div>
                  </div>
                </div>
                <Button
                  v-if="
                    'adminPlayer' in tournament &&
                    username === tournament.adminPlayer &&
                    match.winner === -1 &&
                    match.gameID === -1 &&
                    !match.teams.some((t) => t === -1) &&
                    tournament.status === 'running'
                  "
                  style="margin-left: 10px"
                  icon="pi pi-play"
                  class="p-button-success p-button-rounded p-button-text"
                  @click="startGame(listIndex, matchIndex)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Crown from '@/components/icons/CrownSymbol.vue'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'

import type { PrivateTournament, PublicTournament } from '@/../../server/src/sharedTypes/typesTournament'
import { username } from '@/services/useUser'
import { injectStrict, SocketKey } from '@/services/injections'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import router from '@/router'

const { t } = useI18n()
const props = defineProps<{ tournament: PrivateTournament | PublicTournament }>()
const socket = injectStrict(SocketKey)
const toast = useToast()

async function startGame(tournamentRound: number, roundGame: number) {
  const res = await socket.emitWithAck(1000, 'tournament:private:startGame', {
    tournamentID: props.tournament.id,
    tournamentRound,
    roundGame,
  })
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
.bracketsContainer {
  display: flex;
  flex-direction: row;
  overflow: auto;
}

.bracket {
  display: flex;
  flex-direction: column;
}

.bracket-header {
  white-space: nowrap;
}

.bracket-list-wrapper {
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  height: 100%;
}

.bracket-list {
  display: flex;
  flex-direction: column;
}

.bracket-list-last {
  display: inline-block;
  height: 50%;
  align-self: flex-end;
}

.bracket-list-element {
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 5px 0;
}

.bracket-list-element-last {
  transform: translate(0, -50%);
}

.bracket-connector-outer {
  display: flex;
  justify-content: center;
  align-items: center;
  align-self: stretch;
}

.bracket-connector-inner {
  height: 50%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.bracket-connector-1 {
  height: 100%;
  width: 20px;
  border-top: 4px solid var(--background-contraster);
  border-right: 4px solid var(--background-contraster);
  border-bottom: 4px solid var(--background-contraster);
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

.bracket-connector-2 {
  height: 50%;
  width: 20px;
  border-bottom: 4px solid var(--background-contraster);
}

.bracket-match {
  position: relative;
  border-radius: 10px;
  background-color: var(--background-contraster);
  width: 100%;
}

.bracket-match-team {
  margin: 10px;
}

.bracket-match-team-tag {
  font-weight: bold;
  text-align: left;
  font-size: 0.6rem;
}

.bracket-match-team-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--background-contrastest);
  border-radius: 5px;
  padding: 5px;
}

.bracket-match-team-players {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
}

.bracket-match-team-score {
  margin: 5px;
}

.bracket-match-team-body-won {
  border-left: 8px green solid;
}

.bracket-match-team-body-lost {
  border-left: 8px red solid;
}

.bracket-match-team-body-running {
  border-left: 8px transparent solid;
}

.bracket-match-team-placeholder {
  white-space: nowrap;
}

.crown-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 60px;
  position: absolute;
  right: 5px;
  top: -18px;
}

.crown {
  width: 45%;
  margin-left: auto;
}
</style>
