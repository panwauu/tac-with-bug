import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core';
import { Service } from '../generatedClient';

import { isLoggedIn } from '../services/useUser';

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        colorblind: useStorage('TacSettingsColorblind', false, localStorage),
        defaultPositions: useStorage<[number, number]>('TacSettingsDefaultPositions', [1, 0], localStorage),
    }),
    getters: {},
    actions: {
        setColorblind(colorblind: boolean, saveToServer: boolean): void {
            if (isLoggedIn.value && saveToServer === true) { Service.setColorBlindnessFlag({ colorBlindnessFlag: colorblind }) }
            this.colorblind = colorblind
        },
        setDefaultPosition(position: number, nPlayers: number, saveToServer: boolean): void {
            this.setDefaultPositions([
                nPlayers === 4 ? position : this.defaultPositions[0],
                nPlayers === 6 ? position : this.defaultPositions[1]
            ], saveToServer)
        },
        setDefaultPositions(positions: [number, number], saveToServer: boolean): void {
            if (!validGameDefaultPositions(positions)) { throw new Error('GameDefaultPositions invalid') }
            if (isLoggedIn.value && saveToServer === true) { Service.setGameDefaultPositions({ gameDefaultPositions: positions }) }
            this.defaultPositions = positions
        }
    }
})

function validGameDefaultPositions(pos: [number, number]) {
    return !(!Number.isInteger(pos[0]) || !Number.isInteger(pos[1]) || pos[0] < -1 || pos[1] < -1 || pos[0] > 3 || pos[1] > 5)
}