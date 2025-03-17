import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { DefaultService as Service } from '../generatedClient'

import { isLoggedIn } from '../services/useUser'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    admin: useStorage<boolean>('TacSettingsAdmin', false, localStorage),
    colorblind: useStorage('TacSettingsColorblind', false, localStorage),
    defaultPositions: useStorage<[number, number]>('TacSettingsDefaultPositions', [1, 0], localStorage),
    blockedByModerationUntil: useStorage<string | null>('TacSettingsBlockedByModerationUntil', null, localStorage),
  }),
  getters: {
    isBlockedByModeration(): boolean {
      return this.blockedByModerationUntil !== null && new Date(this.blockedByModerationUntil) > new Date()
    },
    isBlockedByModerationUntil(): Date | null {
      if (this.blockedByModerationUntil === null) {
        return null
      }
      return new Date(this.blockedByModerationUntil)
    },
  },
  actions: {
    setAdmin(admin: boolean): void {
      this.admin = admin
    },
    setColorblind(colorblind: boolean, saveToServer: boolean): void {
      if (isLoggedIn.value && saveToServer === true) {
        Service.setColorBlindnessFlag({ colorBlindnessFlag: colorblind })
      }
      this.colorblind = colorblind
    },
    setDefaultPosition(position: number, nPlayers: number, saveToServer: boolean): void {
      this.setDefaultPositions([nPlayers === 4 ? position : this.defaultPositions[0], nPlayers === 6 ? position : this.defaultPositions[1]], saveToServer)
    },
    setDefaultPositions(positions: [number, number], saveToServer: boolean): void {
      if (!validGameDefaultPositions(positions)) {
        throw new Error('GameDefaultPositions invalid')
      }
      if (isLoggedIn.value && saveToServer === true) {
        Service.setGameDefaultPositions({ gameDefaultPositions: positions })
      }
      this.defaultPositions = positions
    },
    setBlockedByModerationUntil(date: string | null): void {
      this.blockedByModerationUntil = date
    },
  },
})

function validGameDefaultPositions(pos: [number, number]) {
  return !(!Number.isInteger(pos[0]) || !Number.isInteger(pos[1]) || pos[0] < -1 || pos[1] < -1 || pos[0] > 3 || pos[1] > 5)
}
