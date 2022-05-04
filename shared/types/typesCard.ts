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

export type cardType = string//"1"|"2"|"3"|"4"|"5"|"6"|"7"|"7-0"|"7-1"|"7-2"|"7-3"|"7-4"|"7-5"|"7-6"|"8"|"9"|"10"|"12"|"13"|"tac"|"tac-0"|"tac-1"|"tac-2"|"tac-3"|"tac-4"|"tac-5"|"tac-6"|"trickser"|"narr"|"teufel"|"engel"|"kriger"

export interface playerCard {
    possible: boolean,
    textAction: string,
    ballActions: ballActions,
    title: cardType,
}