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
}

export interface AbstractClassGame extends GameData {
  checkWinningTeams(): boolean[]
  resetGame(): void
  getJSON(): string
  updateCardsWithMoves(): void
  checkMove(move: tBall.MoveType): boolean
  performAction(move: tBall.MoveType | 'dealCards', deltaTime: number): void
  performActionAfterStatistics(move: tBall.MoveTextOrBall): void
  determineGameEnded(): void
  determineGameEndedCoop(): void
  performNarrAction(move: tBall.MoveTextOrBall): void
  performTradeCards(move: tBall.MoveTextOrBall): void
  performTextAction(card: tCard.PlayerCard, move: tBall.MoveText): void
  nextPlayer(): void
  priorPlayer(): void
  checkCards(): void
}
