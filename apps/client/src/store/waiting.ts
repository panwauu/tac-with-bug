import type { WaitingGame } from '@/../../server/src/sharedTypes/typesWaiting'
import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { sound } from '../plugins/sound'
import { username } from '@/services/useUser'
import { nextTick } from 'vue'

nextTick(() => {
  const waitingStore = useWaitingStore()
  waitingStore.initStore()
})

function countPlayers(game: WaitingGame | null): number {
  return game?.players.filter((player) => player != null).length ?? 0
}

export const useWaitingStore = defineStore('waiting', {
  state: () => ({
    games: [] as WaitingGame[],
    ownGame: null as WaitingGame | null,
  }),
  getters: {
    rooms: (state) => {
      return state.games.length + (state.ownGame != null ? 1 : 0)
    },
  },
  actions: {
    initStore() {
      this.$state.socket.on('waiting:getGames', this.getGamesHandler)
    },
    getGamesHandler(data: WaitingGame[]) {
      this.games = cloneDeep(data).sort((a, b) => a.id - b.id)

      const index = this.games.findIndex((g) => username.value != null && g.players.includes(username.value))
      if (index !== -1) {
        const newOwnGame = this.games[index]
        const nPlayersBefore = countPlayers(this.ownGame)
        const nPlayersNow = countPlayers(newOwnGame)

        // Only the own game turning full is worth a notification - it may be emitted several times
        // while other games change, so the number of players has to have changed as well
        if (this.ownGame?.id === newOwnGame.id && nPlayersBefore !== nPlayersNow && nPlayersNow === newOwnGame.nPlayers) {
          sound.$play('noti')
        }

        this.ownGame = newOwnGame
        this.games.splice(index, 1)
      } else {
        this.ownGame = null
      }
    },
  },
})
