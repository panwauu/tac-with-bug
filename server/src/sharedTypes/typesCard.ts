import type { BallActions } from './typesBall.js'

export interface CardsType {
  dealingPlayer: number
  discardPlayer: number
  discardedFlag: boolean // Was the last card discarded?
  deck: Array<CardType>
  discardPile: Array<CardType>
  players: Array<Array<CardType>>
  meisterVersion: boolean
}

export type CardType = string

export interface PlayerCard {
  possible: boolean
  textAction: string
  ballActions: BallActions
  title: CardType
}
