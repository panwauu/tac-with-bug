import type { GeneralSocketC } from '@/services/socket';
import type { subscriptionExport } from '@/../../shared/types/typesSubscription';
import type { gameForOverview, getGamesType } from '@/../../shared/types/typesDBgame';

import { reactive, onBeforeUnmount } from 'vue';

export type gamesSummary = {
    nGames: number,
    open: number,
    aborted: number,
    won: number,
    lost: number,
    team: number,
    history: number[],
    runningGames: gameForOverview[],
    getGames: () => void,
    getGamesHandler: (data: getGamesType) => void,
}

export type subscriptionState = {
    status: string | null,
    validuntil: string | null,
    freelicense: boolean,
    loading: boolean,
    reset: () => void,
    update: (data: subscriptionExport) => void,
    getSubscription: () => void,
    newSubscription: (subscriptionID: string) => Promise<any>,
    cancelSubscription: () => Promise<any>,
    isSub: () => boolean,
}

export function useGameView(socket: GeneralSocketC): {
    gamesSummary: gamesSummary,
    subscriptionState: subscriptionState
} {
    const gamesSummary: gamesSummary = reactive({
        nGames: 0,
        open: 0,
        aborted: 0,
        won: 0,
        lost: 0,
        team: 0,
        history: [],
        runningGames: [],
        getGames: () => { socket.emit('games:getGames') },
        getGamesHandler: (data) => {
            gamesSummary.open = data.open
            gamesSummary.aborted = data.aborted
            gamesSummary.won = data.won
            gamesSummary.lost = data.lost
            gamesSummary.team = data.team
            gamesSummary.history = data.history.map((h: number) => { return (h === 0 ? 1 : (h === 1 ? 2 : 1.5)) })
            gamesSummary.nGames = gamesSummary.open + gamesSummary.aborted + gamesSummary.lost + gamesSummary.won + gamesSummary.team
            gamesSummary.runningGames = data.runningGames
        }
    })

    socket.on('games:getGames', gamesSummary.getGamesHandler)

    const subscriptionState: subscriptionState = reactive({
        status: null,
        validuntil: null,
        freelicense: false,
        loading: true,
        reset: () => {
            subscriptionState.status = null
            subscriptionState.validuntil = null
            subscriptionState.freelicense = false
            subscriptionState.loading = false
        },
        update: (data) => {
            subscriptionState.loading = false;
            subscriptionState.status = data.status;
            subscriptionState.validuntil = data.validuntil;
            subscriptionState.freelicense = data.freelicense;
            if (subscriptionState.validuntil != null) {
                const timeout = (new Date(subscriptionState.validuntil)).getTime() - Date.now()
                if (timeout < 2147483647) {
                    setTimeout(function () {
                        console.log('Trigger refresh because of validuntil off')
                        subscriptionState.getSubscription()
                    }, Math.max(0, timeout))
                }
            }
        },
        getSubscription: () => {
            socket.emit('subscription:get')
        },
        newSubscription: async (subscriptionID) => {
            const res = await socket.emitWithAck(10000, 'subscription:new', subscriptionID)
            if (res.status != 200) { throw new Error('Server Error') }
        },
        cancelSubscription: async () => {
            const res = await socket.emitWithAck(10000, 'subscription:cancel')
            if (res.status != 200) { throw new Error('Server Error') }
        },
        isSub: () => {
            if (subscriptionState.loading) { return false }
            return (subscriptionState.freelicense || (subscriptionState.status != null && subscriptionState.status != 'cancelled'))
        }
    })

    socket.on('subscription:get', subscriptionState.update)

    onBeforeUnmount(() => {
        socket.off('games:getGames', gamesSummary.getGamesHandler)
        socket.off('subscription:get', subscriptionState.update)
    })

    return { gamesSummary, subscriptionState }
}