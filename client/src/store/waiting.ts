import type { waitingGame } from '@/../../shared/types/typesWaiting'
import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash';
import { sound } from '../plugins/sound';
import { username } from '@/services/useUser';
import { nextTick } from 'vue';

nextTick(() => {
    const waitingStore = useWaitingStore()
    waitingStore.initStore()
})

export const useWaitingStore = defineStore('waiting', {
    state: () => ({
        games: [] as waitingGame[],
        ownGame: null as waitingGame | null,
    }),
    getters: {
        rooms: (state) => { return state.games.length + (state.ownGame != null ? 1 : 0) }
    },
    actions: {
        initStore() {
            this.$state.socket.on('waiting:getGames', this.getGamesHandler);
        },
        getGamesHandler(data: waitingGame[]) {
            this.games = cloneDeep(data).sort((a, b) => a.id - b.id)

            const index = this.games.findIndex((g) => username.value != null && g.players.includes(username.value));
            if (index !== -1) {
                if (this.ownGame != null && this.ownGame.id === this.games[index].id && this.ownGame.players.filter((p: string) => p != null).length !== data[index].players.filter((p: string) => p != null).length && data[index].players.filter((p: string) => p != null).length === data[index].nPlayers) {
                    sound.$play('noti');
                }

                this.ownGame = this.games[index];
                this.games.splice(index, 1);
            } else {
                this.ownGame = null;
            }
        },
    }
})
