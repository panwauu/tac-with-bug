<template>
  <div
    style="
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
        "
  >
    <Tag
      :value="
        $t('Landing.Waiting.playersWaiting', {
          X: infoStore.totalUsers - infoStore.inGameUsers,
        })
      "
      severity="success"
      style="margin: 5px"
    />
    <Tag
      :value="$t('Landing.Waiting.openRooms', { X: waitingStore.rooms })"
      severity="success"
      style="margin: 5px"
    />
  </div>

  <div
    style="display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;"
  >
    <div style="display: flex; justify-content: center;">
      <div style="display: flex; justify-content: center;" />
      <Dropdown
        v-model="nPlayersSelection"
        :options="nPlayersOptions"
        optionLabel="name"
        :showClear="true"
        placeholder="4/6"
        style="width: 110px;"
      />

      <Dropdown
        v-model="nTeamsSelection"
        :options="nTeamsOptions"
        optionLabel="name"
        :showClear="true"
        placeholder="1 2 3"
        style="width: 110px;"
      />
    </div>
    <div style="display: flex; justify-content: center;">
      <Dropdown
        v-model="meisterSelection"
        :options="meisterOptions"
        optionLabel="name"
        :showClear="true"
        style="width: 110px;"
      >
        <template #value="slotProps">
          <div v-if="slotProps.value">
            <Brain v-if="slotProps.value.value" class="svgToIcon" />
            <Heart v-else class="svgToIcon" />
          </div>
          <span v-else>
            <div style="display: flex;">
              <Heart class="svgToIcon" />
              <Brain class="svgToIcon" />
            </div>
          </span>
        </template>
        <template #option="slotProps">
          <div v-if="slotProps.option.value" style="display: flex;">
            <Brain class="svgToIcon" style="margin-right: 5px;" />
            <div>{{ $t('Waiting.WaitingGameCreator.meisterTrueName') }}</div>
          </div>
          <div v-else style="display: flex;">
            <Heart class="svgToIcon" style="margin-right: 5px;" />
            <div>{{ $t('Waiting.WaitingGameCreator.meisterFalseName') }}</div>
          </div>
        </template>
      </Dropdown>

      <Dropdown
        v-model="privateSelection"
        :options="privateOptions"
        optionLabel="name"
        :showClear="true"
        style="width: 110px;"
      >
        <template #value="slotProps">
          <div v-if="slotProps.value">
            <i v-if="slotProps.value.value" :class="`pi pi-lock`" aria-hidden="true" />
            <i v-else :class="`pi pi-lock-open`" aria-hidden="true" />
          </div>
          <span v-else>
            <div style="display: flex;">
              <i :class="`pi pi-lock`" aria-hidden="true" />
              <i :class="`pi pi-lock-open`" aria-hidden="true" />
            </div>
          </span>
        </template>
        <template #option="slotProps">
          <div v-if="slotProps.option.value" style="display: flex;">
            <i :class="`pi pi-lock`" style="margin-right: 5px;" aria-hidden="true" />
            <div>{{ $t('Waiting.WaitingGameCreator.privateTrueName') }}</div>
          </div>
          <div v-else style="display: flex;">
            <i :class="`pi pi-lock-open`" style="margin-right: 5px;" aria-hidden="true" />
            <div>{{ $t('Waiting.WaitingGameCreator.privateFalseName') }}</div>
          </div>
        </template>
      </Dropdown>
    </div>
    <Button
      v-if="isLoggedIn"
      :label="$t('Waiting.WaitingGameCreator.startButton')"
      icon="pi pi-plus"
      :disabled="waitingStore.ownGame != null"
      @click="gameCreatorVisible = true"
    />
  </div>

  <div
    style="
      display: flex;
      width: 100%;
      justify-content: center;
      align-items: center;
    "
  >
    <WaitingGame
      v-if="waitingStore.ownGame != null"
      class="activeGame"
      :game="waitingStore.ownGame"
      :active="true"
      @move-player="movePlayer"
      @remove-player="removePlayer"
      @ready-player="setPlayerReady"
      @color-player="setPlayerColor"
    />
  </div>

  <div class="playersCard">
    <WaitingGame
      v-for="(game, index) in filteredWaitingGames"
      :key="`WaitingGame-${String(index)}`"
      :game="game"
      :class="[waitingStore.ownGame != null ? 'inactiveGame' : '']"
      @click="joinGame(game)"
    />
    <p
      v-if="filteredWaitingGames.length === 0 && waitingStore.ownGame === null"
    >{{ $t("Waiting.noRoomsPlaceholder") }}</p>
  </div>

  <WaitingGameCreator v-if="gameCreatorVisible" v-model:visible="gameCreatorVisible" />
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dropdown from 'primevue/dropdown';
import WaitingGame from '@/components/WaitingGame.vue';
import WaitingGameCreator from '@/components/WaitingGameCreator.vue';
import Brain from '@/components/icons/BrainSymbol.vue'
import Heart from '@/components/icons/HeartSymbol.vue'

import { ref, computed, onUnmounted } from 'vue';
import { i18n } from '@/services/i18n';
import router from '@/router/index';
import { injectStrict, SocketKey } from '@/services/injections';
import type { startGameType, waitingGame } from '@/../../shared/types/typesWaiting';
import { isLoggedIn, username } from '@/services/useUser';
import { useServerInfoStore } from '@/store/serverInfo';
import { useWaitingStore } from '@/store/waiting';
const infoStore = useServerInfoStore()

const socket = injectStrict(SocketKey)

const waitingStore = useWaitingStore()

i18n.global.t('Waiting.WaitingGameCreator.teams1Name')
const nPlayersOptions = [
  { name: i18n.global.t('Waiting.WaitingGameCreator.player4Name'), value: 4 },
  { name: i18n.global.t('Waiting.WaitingGameCreator.player6Name'), value: 6 }
]
const nPlayersSelection = ref<typeof nPlayersOptions[0] | null>(null)

const nTeamsOptions = [
  { name: i18n.global.t('Waiting.WaitingGameCreator.teams1Name'), value: 1 },
  { name: i18n.global.t('Waiting.WaitingGameCreator.teams2Name'), value: 2 },
  { name: i18n.global.t('Waiting.WaitingGameCreator.teams3Name'), value: 3 }
]
const nTeamsSelection = ref<typeof nTeamsOptions[0] | null>(null)

const meisterOptions = [{ name: 'Meister', value: true }, { name: 'Normal', value: false }]
const meisterSelection = ref<typeof meisterOptions[0] | null>(null)

const privateOptions = [{ name: 'Öffentlich', value: false }, { name: 'Privat', value: true }]
const privateSelection = ref<typeof privateOptions[0] | null>(privateOptions[0])

const filteredWaitingGames = computed(() => waitingStore.games.filter((waitingGame) => {
  return (nPlayersSelection.value == null || waitingGame.nPlayers === nPlayersSelection.value.value) &&
    (nTeamsSelection.value == null || waitingGame.nTeams === nTeamsSelection.value.value) &&
    (meisterSelection.value == null || waitingGame.meister === meisterSelection.value.value) &&
    (privateSelection.value == null || waitingGame.private === privateSelection.value.value)
}))

const gameCreatorVisible = ref(false)

socket.on('waiting:startGame', startGameHandler);
onUnmounted(() => {
  socket.off('waiting:startGame', startGameHandler);
})


function startGameHandler(data: startGameType) {
  router.push({ name: 'Game', query: data });
}

function joinGame(game: waitingGame) {
  if (!isLoggedIn.value) { return }

  if ((waitingStore.ownGame === null && game.private === true && !confirm(i18n.global.t('Waiting.joinGamePrivate'))) ||
    (waitingStore.ownGame != null && game.private === false && !confirm(i18n.global.t('Waiting.switchGameConfirm')))) {
    return;
  }

  socket.emit('waiting:joinGame', game.id);
}

function movePlayer(data: { gameID: number, username: string, steps: number }) {
  socket.emit('waiting:movePlayer', data);
}

function removePlayer(usernameToRemove: string) {
  const confirmText = i18n.global.t(
    usernameToRemove === username.value
      ? 'Waiting.removePlayerConfirmSelf'
      : 'Waiting.removePlayerConfirmOther'
  );
  if (confirm(confirmText)) {
    socket.emit('waiting:removePlayer', usernameToRemove);
  }
}

function setPlayerReady(gameID: number) {
  socket.emit('waiting:readyPlayer', {
    gameID: gameID,
  });
}

function setPlayerColor(usernameToChange: string, gameID: number, color: string) {
  socket.emit('waiting:switchColor', {
    gameID: gameID,
    username: usernameToChange,
    color: color,
  });
}
</script>

<style scoped>
.gameButtons {
  margin-bottom: 20px;
}

.activeGame {
  max-width: 600px;
  flex-grow: 1;
}

.playersCard {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}

.inactiveGame {
  filter: brightness(0.8) grayscale(1);
}

.svgToIcon {
  height: 1.2rem;
}
</style>
