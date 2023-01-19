import { sound } from '@/plugins/sound'
import type { CardsStateType } from './useCards'
import type { MiscStateType } from './useMisc'
import type { UpdateDataType } from '@/../../server/src/sharedTypes/typesDBgame'

export function audioHandler(newData: UpdateDataType, cardsState: CardsStateType, miscState: MiscStateType): void {
  if (newData.gamePlayer === -1) {
    return
  }

  if (newData.gameEnded) {
    if (newData.winningTeams[newData.players[newData.gamePlayer].team] === true) {
      sound.$play('won')
    } else {
      sound.$play('lost')
    }
  } else if (
    newData.running &&
    newData.cards.some((card) => card.possible === true) &&
    (cardsState.cards.every((card) => card.possible === false) || cardsState.cards.length === 0)
  ) {
    sound.$play('noti')
  } else if (
    newData.players.length > 0 &&
    newData.players[newData.gamePlayer].narrFlag[0] === true &&
    newData.players[newData.gamePlayer].narrFlag[1] === false &&
    !(miscState.players.length > 0 && miscState.players[newData.gamePlayer].narrFlag[0] === true && miscState.players[newData.gamePlayer].narrFlag[1] === false)
  ) {
    sound.$play('noti')
  }
}
