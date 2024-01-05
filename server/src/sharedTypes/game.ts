import type * as tCard from './typesCard'
import type * as tBall from './typesBall'
import type * as tStatistic from './typesStatistic'

export interface GameData {
  nPlayers: number
  coop: boolean
  priorBalls: tBall.BallsType
  aussetzenFlag: boolean
  teufelFlag: boolean
  tradeFlag: boolean
  tradedCards: (tCard.CardType | null)[]
  tradeDirection: number
  narrFlag: boolean[]
  narrTradedCards: (tCard.CardType[] | null)[]
  balls: tBall.BallsType
  cards: tCard.CardsType
  teams: number[][]
  cardsWithMoves: tCard.PlayerCard[]
  activePlayer: number
  sevenChosenPlayer: number | null
  gameEnded: boolean
  winningTeams: boolean[]
  statistic: tStatistic.GameStatistic[]
  substitutedPlayerIndices: number[]
}

export type Substitution = {
  substitute:
    | {
        userID: number
        username: string
        botID: null
        botUsername: null
      }
    | {
        userID: null
        username: null
        botID: number
        botUsername: string
      }
  playerIndexToSubstitute: number
  acceptedByIndex: number[]
  startDate: number
}
