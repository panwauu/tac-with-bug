<template>
  <DataTable
    ref="td"
    v-model:selection="selectedGame"
    :value="games"
    :lazy="true"
    data-key="id"
    :selectionMode="username === loggedInUser ? 'multiple' : undefined"
    class="p-datatable-sm gamesTable p-card"
    sortField="created"
    :sortOrder="-1"
    :paginator="paginator ?? true"
    :rows="10"
    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
    :rowsPerPageOptions="[10, 20, 50]"
    :autoLayout="true"
    :totalRecords="nEntries"
    :loading="loading"
    @rowSelect="rowSelect()"
    @page="$emit('page', $event)"
    @sort="$emit('sort', $event)"
  >
    <template #empty>{{ $t('Games.tableNoGames') }}</template>
    <template #loading>{{ $t('Games.tableLoading') }}</template>
    <ColumnGroup type="header">
      <Row>
        <Column
          :header="$t('Games.columnTitles.created')"
          :rowspan="2"
          :sortable="true"
          sortField="created"
        />
        <Column
          :header="$t('Games.columnTitles.status')"
          :rowspan="1"
          sortField="status"
        />
        <Column :colspan="3">
          <template #header>
            <div class="teams-header">{{ $t('Games.columnTitles.teams') }}</div>
          </template>
        </Column>
        <Column :rowspan="2" />
      </Row>
      <Row>
        <Column />
        <Column
          :header="$t('Games.columnTitles.team') + ' 1'"
          field="nTeams"
        />
        <Column
          :header="$t('Games.columnTitles.team') + ' 2'"
          field="nTeams"
        />
        <Column
          :header="$t('Games.columnTitles.team') + ' 3'"
          field="nTeams"
        />
      </Row>
    </ColumnGroup>
    <Column field="created">
      <template #body="slotProps">
        <div>{{ createDateString(slotProps.data.created) }}</div>
      </template>
    </Column>
    <Column
      field="status"
      :sortable="true"
      filterMatchMode="in"
    >
      <template #body="slotProps">
        <div style="width: 100%; height: 100%; display: flex; justify-content: flex-start; align-items: center">
          <Tag
            :severity="statusToSeverity(slotProps.data.status)"
            :value="$t(`Games.stati.${slotProps.data.status}`).toUpperCase()"
          />
        </div>
      </template>
    </Column>
    <Column
      v-for="teamIndex in [0, 1, 2]"
      :key="'team-' + teamIndex"
      filterField="teams"
      filterMatchMode="in"
    >
      <template #body="slotProps">
        <div
          v-for="player in slotProps.data.teams[teamIndex]"
          :key="'Team-' + teamIndex + '-Player-' + player"
          class="player"
        >
          <PlayerWithPicture
            v-if="player != null"
            :clickable="false"
            :nameFirst="false"
            :username="player"
            :bot="slotProps.data.bots[slotProps.data.players.indexOf(player)] != null"
          />
        </div>
      </template>
    </Column>
    <Column field="id">
      <template #body="slotProps">
        <Button
          v-if="
            username === loggedInUser && slotProps.data.status === 'running' && slotProps.data.tournamentid === null && Date.now() - slotProps.data.created < 1000 * 60 * 5
          "
          icon="pi pi-times"
          class="p-button-rounded p-button-danger p-button-text"
          @click="abortButton(slotProps.data)"
        />
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import Tag from 'primevue/tag'
import Button from 'primevue/button'

import type { GameForOverview } from '@/../../server/src/sharedTypes/typesDBgame'
import { ref } from 'vue'
import { username as loggedInUser } from '@/services/useUser'
import { DefaultService as Service } from '@/generatedClient'

const emit = defineEmits<{
  sort: [events: any]
  page: [events: any]
  rowSelect: [game: GameForOverview]
  reload: [event: any]
}>()

defineProps<{ username: string; games: GameForOverview[]; nEntries: number; loading: boolean; paginator?: boolean }>()

const selectedGame = ref<GameForOverview[]>([])
const td = ref<any | null>(null)

function rowSelect() {
  emit('rowSelect', selectedGame.value[0])
  selectedGame.value = []
}

function abortButton(game: GameForOverview) {
  if (confirm('Möchtest du dieses Spiel beenden?')) {
    Service.abortGame({ gameID: game.id }).then(() => {
      emit('reload', {
        first: td.value.first,
        rows: td.value.rows,
        sortField: td.value.sortField,
        sortOrder: td.value.sortOrder,
      })
    })
  }
}

function createDateString(seconds: number) {
  const d = new Date(seconds)
  return d.toLocaleDateString()
}

function statusToSeverity(status: string) {
  if (status === 'running') {
    return 'info'
  } else if (status === 'aborted') {
    return 'warning'
  } else if (status === 'lost') {
    return 'danger'
  } else {
    return 'success'
  }
}
</script>

<style scoped>
.teams-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.player {
  padding: 0;
  margin: 2px;
  display: flex;
  align-items: center;
}

.gamesTable {
  width: 100%;
}
</style>
