import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import { getRunningGamesType } from '@/../../shared/types/typesDBgame'

nextTick(() => {
    const serverInfoStore = useServerInfoStore()
    serverInfoStore.initStore()
})

export const useServerInfoStore = defineStore('serverInfo', {
    state: () => ({
        totalUsers: 0,
        authenticatedUsers: 0,
        inGameUsers: 0,
        runningGames: [] as getRunningGamesType[],
    }),
    getters: {},
    actions: {
        initStore() {
            this.$state.socket.on('info:serverConnections', (data) => {
                this.totalUsers = data.total
                this.inGameUsers = data.game
                this.authenticatedUsers = data.authenticated
            })
            this.$state.socket.on('games:getRunningGames', (games) => {
                this.runningGames = games.sort((a, b) => { return b.created - a.created })
            })
        }
    },
})