import { lastTournamentWinners } from '@/../../shared/types/typesTournament'
import { GeneralSocketC } from './socket'
import { ref } from 'vue'

const tournamentWinners = ref<lastTournamentWinners>([])

export async function initTournamentWinners(socket: GeneralSocketC) {
  const res = await socket.emitWithAck(20000, 'tournament:winners:get')
  if (res.data == null) {
    console.error(res.error)
    return
  }
  tournamentWinners.value = res.data

  socket.on('tournament:winners:update', (winners) => {
    tournamentWinners.value = winners
  })
}

export function getWinners() {
  return tournamentWinners
}

export function getCrown(username: string): number | undefined {
  return tournamentWinners.value.find((w) => w.players.includes(username))?.placement
}
