import { ballActions } from './typesBall'

export interface cardsType {
    dealingPlayer: number,
    discardPlayer: number,
    discardedFlag: boolean, // Was the last card discarded?
    deck: Array<cardType>,
    discardPile: Array<cardType>,
    players: Array<Array<cardType>>,
    meisterVersion: boolean
}

export type cardType = string

export interface playerCard {
    possible: boolean,
    textAction: string,
    ballActions: ballActions,
    title: cardType,
}
