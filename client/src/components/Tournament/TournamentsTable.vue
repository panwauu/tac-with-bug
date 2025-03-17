<template>
  <div style="position: relative">
    <DataTable
      v-model:selection="selectedTournament"
      :value="tournaments"
      :loading="loading"
      :lazy="true"
      :paginator="true"
      :rows="rowsInTable"
      selection-mode="multiple"
      :total-records="totalTournaments"
      :auto-layout="true"
      @row-select="selectTournament()"
      @page="getHistory($event.first)"
    >
      <Column
        field="title"
        :header="t('Tournament.TournamentsTable.title')"
      />
      <Column
        field="type"
        :header="t('Tournament.TournamentTable.type')"
      >
        <template #body="slotProps">
          <Tag
            :icon="`pi pi-eye${slotProps.data.type === 'public' ? '' : '-slash'}`"
            :severity="slotProps.data.type === 'public' ? 'success' : undefined"
            :value="t(`Tournament.TournamentTable.${slotProps.data.type}`).toUpperCase()"
          />
        </template>
      </Column>
      <Column
        field="date"
        :header="t('Tournament.TournamentsTable.date')"
      >
        <template #body="slotProps">
          <div>{{ createDateString(slotProps.data.date) }}</div>
        </template>
      </Column>
      <Column
        field="status"
        :header="t('Tournament.TournamentTable.status')"
      >
        <template #body="slotProps">
          <TournamentStatusBadge :status="slotProps.data.status" />
        </template>
      </Column>
    </DataTable>
    <Button
      icon="pi pi-refresh"
      class="p-button-rounded p-button-sm p-button-text p-button-secondary refreshButton"
      @click="getHistory(0)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import TournamentStatusBadge from './TournamentStatusBadge.vue'

import { ref, watch } from 'vue'
import router from '@/router/index'
import { injectStrict, SocketKey } from '@/services/injections'
import type { TournamentTableElement } from '../../../../server/src/sharedTypes/typesTournament'
import { isLoggedIn } from '@/services/useUser'

const socket = injectStrict(SocketKey)

const rowsInTable = 10
const selectedTournament = ref<TournamentTableElement[]>([])
const loading = ref(false)
const tournaments = ref<TournamentTableElement[]>([])
const totalTournaments = ref(0)

watch(isLoggedIn, () => getHistory(0))
getHistory(0)
async function getHistory(first: number) {
  loading.value = true

  try {
    const res = await socket.emitWithAck(2000, 'tournament:loadTable', { first, limit: rowsInTable, filter: null })
    if (res.status !== 200 || res.data === undefined) {
      return router.push({ name: 'Landing' })
    }

    tournaments.value = res.data.tournaments
    totalTournaments.value = res.data.total
    loading.value = false
  } catch (err) {
    console.error(err)
    router.push({ name: 'Landing' })
  }
}

function createDateString(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function selectTournament() {
  if (selectedTournament.value.length !== 1) {
    return
  }

  const tournament = selectedTournament.value[0]
  router.push({ name: tournament.type === 'public' ? 'PublicTournament' : 'PrivateTournament', params: { id: tournament.id } })
  selectedTournament.value = []
}
</script>

<style scoped>
.refreshButton {
  position: absolute;
  right: 5px;
  top: 5px;
}
</style>
