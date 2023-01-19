import { reactive, watch } from 'vue'
import { i18n } from '@/services/i18n'

import type { MiscStateType } from './useMisc'
import type { CardsStateType } from './useCards'
import type { BallsStateType } from './useBalls'

export interface InstructionsStateType {
  instructions: string[]
}

export function useInstructions(miscState: MiscStateType, ballsState: BallsStateType, cardsState: CardsStateType): InstructionsStateType {
  const instructionsState: InstructionsStateType = reactive({ instructions: [] })

  watch([miscState, ballsState, cardsState], () => {
    if (!miscState.players || !(typeof miscState.players !== 'undefined' && miscState.players.length > 0) || miscState.gamePlayer === -1) {
      return
    }

    const instructions = []
    if ('tradeInformation' in miscState.players[miscState.gamePlayer]) {
      if (miscState.players[miscState.gamePlayer]?.tradeInformation?.[1] === false) {
        instructions.push(i18n.global.t('Game.Instructions.needToTrade'))
        instructions.push(i18n.global.t('Game.Instructions.needToChooseCard'))
      } else {
        const playersToTrade: string[] = []
        miscState.players.filter((player) => player.tradeInformation?.[1] === false).forEach((player) => playersToTrade.push(player.name))
        instructions.push(i18n.global.t('Game.Instructions.needToWait'))
        instructions.push(i18n.global.t('Game.Instructions.waitingFor') + playersToTrade.join(', '))
      }
    } else if (miscState.players[miscState.gamePlayer]?.narrFlag[0] === true) {
      if (miscState.players[miscState.gamePlayer].narrFlag[1] === false) {
        instructions.push(i18n.global.t('Game.Instructions.needToNarr'))
        instructions.push(i18n.global.t('Game.Instructions.needToNarrButton'))
      } else {
        const playersToTrade: string[] = []
        miscState.players.filter((player) => player.narrFlag[1] === false).forEach((player) => playersToTrade.push(player.name))
        instructions.push(i18n.global.t('Game.Instructions.needToWait'))
        instructions.push(i18n.global.t('Game.Instructions.narrWaitingFor') + playersToTrade.join(', '))
      }
    } else {
      if (miscState.players[miscState.gamePlayer].active === false) {
        instructions.push(i18n.global.t('Game.Instructions.needToWait'))
        instructions.push(i18n.global.t('Game.Instructions.currentlyPlaying') + miscState.players.find((player) => player.active === true)?.name)
      } else {
        if (miscState.aussetzenFlag) {
          instructions.push(i18n.global.t('Game.Instructions.needToSkip'))
        } else if (miscState.teufelFlag) {
          instructions.push(i18n.global.t('Game.Instructions.needToChooseCard', { name: miscState.players[(miscState.gamePlayer + 1) % miscState.nPlayers].name }))
        } else {
          instructions.push(i18n.global.t('Game.Instructions.yourTurn'))
        }

        if (cardsState.cards.every((card) => card.textAction === 'abwerfen')) {
          instructions.push(i18n.global.t('Game.Instructions.needToDiscard'))
        }

        if (cardsState.selectedCard === -1) {
          instructions.push(i18n.global.t('Game.Instructions.needToChooseCard'))
        } else {
          if (Object.keys(ballsState.playableBalls).length === 0) {
            instructions.push(i18n.global.t('Game.Instructions.buttonOrOtherCard'))
          } else if (cardsState.cards[cardsState.selectedCard].title.includes('-')) {
            const title = cardsState.cards[cardsState.selectedCard].title
            const remainingSteps = parseInt(title.substring(title.indexOf('-') + 1))
            instructions.push(i18n.global.t('Game.Instructions.remainingSteps', { steps: remainingSteps }))
          } else {
            instructions.push(i18n.global.t('Game.Instructions.moveOrOtherCard'))
          }
        }
      }
    }
    instructionsState.instructions = instructions
  })

  return instructionsState
}
