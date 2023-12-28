import { MoveTextOrBall } from '../../sharedTypes/typesBall'
import { AiData, getAiData } from './simulation'
import { Game } from '../../game/game'
import { initalizeStatistic } from '../../game/statistic'

export function previewMove(data: AiData, move: MoveTextOrBall): AiData {
  // Convert data back to game
  const game = new Game(
    data.nPlayers,
    data.teams.length,
    data.meisterVersion,
    data.coop,
    structuredClone({
      nPlayers: data.nPlayers,
      coop: data.coop,
      teams: data.teams,

      tradeDirection: data.tradeDirection,
      aussetzenFlag: false,
      teufelFlag: data.teufelFlag,
      tradeFlag: false,
      tradeCards: [],
      narrFlag: Array.from({ length: data.nPlayers }, () => false),
      activePlayer: data.activePlayer,
      sevenChosenPlayer: data.sevenChosenPlayer,

      balls: data.balls,
      priorBalls: data.priorBalls,

      gameEnded: false,
      winningTeams: Array.from({ length: data.teams.length }, () => false),

      cards: {
        dealingPlayer: 0,
        discardPlayer: 0,
        discardedFlag: false,
        deck: [],
        discardPile: data.discardPile,
        players: Array.from({ length: data.nPlayers }, (_, i) => (i === 0 ? data.cardsWithMoves.map((c) => c.title) : [])),
        meisterVersion: data.meisterVersion,
      },
      cardsWithMoves: data.cardsWithMoves,

      statistic: initalizeStatistic(data.nPlayers),
      substitutedPlayerIndices: [],
    })
  )

  // Perform move
  if (!game.checkMove(move)) throw new Error('Invalid move')
  game.performActionAfterStatistics(move)

  // Reset activePlayer to 0
  if (game.activePlayer !== 0) game.activePlayer = 0

  // Calculate cards with moves
  game.updateCardsWithMoves()
  if (!game.gameEnded && game.cardsWithMoves.length > 0 && game.cardsWithMoves.every((c) => !c.possible)) throw new Error('No possible moves found')

  // convert back to data
  return getAiData(game, 0, {
    hadOneOrThirteen: data.hadOneOrThirteen,
    tradedCards: Array.from({ length: data.nPlayers }, (_, i) => (i === 0 ? data.tradedCard : null)),
    narrTradedCards: Array.from({ length: data.nPlayers }, (_, i) => (i === 0 ? data.narrTradedCards : null)),
    previouslyUsedCards: data.previouslyUsedCards,
  })
}
