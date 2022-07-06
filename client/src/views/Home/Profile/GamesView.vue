<template>
  <GamesTable
    :loading="loading"
    :nEntries="nEntries"
    :games="games"
    :username="username"
    :paginator="true"
    @page="onPageOrSort"
    @sort="onPageOrSort"
    @rowSelect="startGame"
    @reload="reload"
  />
</template>

<script setup lang="ts">
import GamesTable from '@/components/GamesTable.vue'

import type { gameForOverview } from '@/../../server/src/sharedTypes/typesDBgame'
import { ref, onMounted } from 'vue'
import router from '@/router/index'
import { injectStrict, SocketKey } from '@/services/injections'
import { username as loggedInUser } from '@/services/useUser'

const socket = injectStrict(SocketKey)
const props = defineProps<{ username: string }>()

const loading = ref(false)
const nEntries = ref(0)
const games = ref<gameForOverview[]>([])

onMounted(() => {
  loadGames(0, 10, 'created', -1)
})

function startGame(game: any) {
  router.push({
    name: 'Game',
    query: {
      gameID: game.id,
      nPlayers: game.players.length,
    },
    params: { locale: router.currentRoute.value.params.locale },
  })
}

function reload(event: any) {
  loadGames(event.first, event.rows, event.sortField, event.sortOrder)
}

function onPageOrSort(event: any) {
  loadGames(event.first, event.rows, event.sortField, event.sortOrder)
}

async function loadGames(first: number, limit: number, sortField?: string, sortOrder?: number) {
  try {
    loading.value = true
    const res = await socket.emitWithAck(5000, 'games:getTableData', {
      first,
      limit,
      sortField,
      sortOrder,
      username: props.username === loggedInUser.value ? undefined : props.username,
    })
    if (res.data === undefined) {
      throw new Error('Server Side Error')
    }
    games.value = res.data.games
    nEntries.value = res.data.nEntries
    loading.value = false
  } catch (err) {
    console.log(err)
    router.push({ name: 'Landing' })
  }
}
</script>

<style scoped></style>
