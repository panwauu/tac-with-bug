import type { GeneralSocketC } from '@/services/socket'
import type { GameForOverview, GetGamesType } from '@/../../server/src/sharedTypes/typesDBgame'

import { reactive, onBeforeUnmount } from 'vue'

export type GamesSummary = {
  nGames: number
  open: number
  aborted: number
  won: number
  lost: number
  team: number
  history: number[]
  runningGames: GameForOverview[]
  getGames: () => void
  getGamesHandler: (data: GetGamesType) => void
}

export function useGamesSummary(socket: GeneralSocketC): GamesSummary {
  const gamesSummary: GamesSummary = reactive({
    nGames: 0,
    open: 0,
    aborted: 0,
    won: 0,
    lost: 0,
    team: 0,
    history: [],
    runningGames: [],
    getGames: () => {
      socket.emit('games:getGames')
    },
    getGamesHandler: (data) => {
      gamesSummary.open = data.open
      gamesSummary.aborted = data.aborted
      gamesSummary.won = data.won
      gamesSummary.lost = data.lost
      gamesSummary.team = data.team
      gamesSummary.history = data.history.map((h: number) => {
        return h === 0 ? 1 : h === 1 ? 2 : 1.5
      })
      gamesSummary.nGames = gamesSummary.open + gamesSummary.aborted + gamesSummary.lost + gamesSummary.won + gamesSummary.team
      gamesSummary.runningGames = data.runningGames
    },
  })

  socket.on('games:getGames', gamesSummary.getGamesHandler)

  onBeforeUnmount(() => {
    socket.off('games:getGames', gamesSummary.getGamesHandler)
  })

  return gamesSummary
}
