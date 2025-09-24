import type { BallActions } from './ball'

export interface CardsType {
  dealingPlayer: number
  discardPlayer: number
  discardedFlag: boolean // Was the last card discarded?
  deck: Array<CardType>
  discardPile: Array<CardType> // Cards that were played in the current "round" of cards
  previouslyPlayedCards: Array<CardType> // Cards from the current deck that were already played before the current "round"
  players: Array<Array<CardType>>
  meisterVersion: boolean
  hadOneOrThirteen: boolean[]
}

export type CardType = string

export interface PlayerCard {
  possible: boolean
  textAction: string
  ballActions: BallActions
  title: CardType
}
