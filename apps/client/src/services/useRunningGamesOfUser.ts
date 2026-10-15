import type { GeneralSocketC } from '@/services/socket'
import type { GameForOverview } from '@repo/core/types'

import { reactive, onBeforeUnmount } from 'vue'

// The running games of the logged-in user, kept up to date by the server: it pushes the list at login and at every
// game start, game end, abort and completed substitution. Nothing here describes finished games - the counters and
// results of the whole history belong to the profile (Service.getPlayerStats).
export type RunningGamesOfUser = {
  games: GameForOverview[]
  requestGames: () => void
  updateHandler: (games: GameForOverview[]) => void
}

export function useRunningGamesOfUser(socket: GeneralSocketC): RunningGamesOfUser {
  const runningGamesOfUser: RunningGamesOfUser = reactive({
    games: [],
    requestGames: () => {
      socket.emit('games:getRunningGamesOfUser')
    },
    updateHandler: (games) => {
      runningGamesOfUser.games = games
    },
  })

  socket.on('games:runningGamesOfUser', runningGamesOfUser.updateHandler)

  onBeforeUnmount(() => {
    socket.off('games:runningGamesOfUser', runningGamesOfUser.updateHandler)
  })

  return runningGamesOfUser
}
