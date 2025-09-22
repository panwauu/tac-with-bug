<template>
  <h2>{{ t('RunningGamesWidget.Header') }}</h2>
  <p>{{ t('RunningGamesWidget.Description') }}</p>
  <div class="gamesTableContainer">
    <DataTable
      v-model:selection="selectedGame"
      :value="infoStore.runningGames"
      :selection-mode="'multiple'"
      class="p-datatable-sm gamesTable"
      :scrollable="true"
      scroll-height="flex"
      :auto-layout="true"
      @row-select="rowSelect()"
    >
      <template #empty>{{ t('RunningGamesWidget.emptyTable') }}</template>
      <Column
        v-for="teamIndex in [0, 1, 2]"
        :key="'team-' + teamIndex"
        :header="t('Games.columnTitles.team') + ' ' + (teamIndex + 1).toString()"
      >
        <template #body="slotProps">
          <div class="playerContainer">
            <PlayerWithPicture
              v-for="(_, playerIndex) in slotProps.data.teams[teamIndex]"
              :key="`Team-${teamIndex}-Player-${playerIndex}`"
              class="player"
              :clickable="false"
              :name-first="false"
              :username="slotProps.data.teams[teamIndex][playerIndex] ?? ''"
              :bot="slotProps.data.bots[teamIndex][playerIndex] ?? false"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import PlayerWithPicture from './PlayerWithPicture.vue'

import { ref } from 'vue'
import type { GetRunningGamesType } from 'tac-core/types/typesDBgame'
import router from '@/router'
import { useServerInfoStore } from '@/store/serverInfo'

const selectedGame = ref<GetRunningGamesType[]>([])

const infoStore = useServerInfoStore()

function rowSelect() {
  if (selectedGame.value.length !== 1) {
    console.log('Could not select game')
    selectedGame.value = []
    return
  }
  router.push({
    name: 'Game',
    query: {
      gameID: selectedGame.value[0].id,
      nPlayers: selectedGame.value[0].teams.flat().length,
    },
  })
}
</script>

<style scoped>
.playerContainer {
  display: flex;
  flex: 1 1 1fr;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.player {
  padding: 0;
  margin: 2px;
}

.refreshButton {
  position: absolute;
  right: 5px;
  top: 5px;
}

.gamesTableContainer {
  min-height: 250px;
  flex-grow: 1;
  width: 100%;
  position: relative;
}

.gamesTable {
  position: absolute;
  left: 0;
  right: 0;
  height: 100%;
  width: 100%;
}
</style>
