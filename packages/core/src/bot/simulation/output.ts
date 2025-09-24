import type { BallsType } from '../../types/ball'
import type { CardType, PlayerCard } from '../../types/card'
import { getCards } from '../../game/serverOutput'
import { Game } from '../../game/game'
import { modulo, rightShiftArray } from '../normalize/helpers'
import { rightShiftBalls, rightShiftCards } from '../normalize/normalize'

export type AiData = {
  nPlayers: number
  teams: number[][]
  coop: boolean
  meisterVersion: boolean
  gamePlayer: number

  balls: BallsType
  priorBalls: BallsType

  teufelFlag: boolean

  tradeFlag: boolean
  tradedCard: CardType | null
  tradeDirection: number
  hadOneOrThirteen: boolean[]

  narrTradedCards: CardType[] | null

  cardsWithMoves: PlayerCard[]
  discardPile: CardType[]
  previouslyUsedCards: CardType[]

  dealingPlayer: number

  activePlayer: number
  sevenChosenPlayer: number | null
}

export function getAiData(game: Game, gamePlayer: number): AiData {
  const rightShiftBy = modulo(-gamePlayer, game.nPlayers)

  return {
    nPlayers: game.nPlayers,
    teams: game.teams,
    coop: game.coop,
    meisterVersion: game.cards.meisterVersion,
    gamePlayer: 0,

    balls: rightShiftBalls(game, game.balls, rightShiftBy),
    priorBalls: rightShiftBalls(game, game.priorBalls, rightShiftBy),

    teufelFlag: game.teufelFlag,

    tradeFlag: game.tradeFlag,
    tradedCard: game.tradedCards[gamePlayer],
    tradeDirection: game.tradeDirection,
    hadOneOrThirteen: rightShiftArray(game.cards.hadOneOrThirteen, rightShiftBy),

    narrTradedCards: game.narrTradedCards[gamePlayer],

    cardsWithMoves: rightShiftCards(game, getCards(game, gamePlayer), rightShiftBy),
    discardPile: game.cards.discardPile,
    previouslyUsedCards: [...game.cards.previouslyPlayedCards],

    dealingPlayer: modulo(game.cards.dealingPlayer + rightShiftBy, game.nPlayers),

    activePlayer: modulo(game.activePlayer + rightShiftBy, game.nPlayers),
    sevenChosenPlayer: game.sevenChosenPlayer == null ? null : modulo(game.sevenChosenPlayer + rightShiftBy, game.nPlayers),
  }
}
