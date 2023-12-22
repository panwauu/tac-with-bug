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
  tradeCards: tCard.CardType[]
  tradeDirection: number
  narrFlag: boolean[]
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
  substitutionUserID: number
  substitutionUsername: string
  playerIndexToSubstitute: number
  acceptedByIndex: number[]
  startDate: number
}
