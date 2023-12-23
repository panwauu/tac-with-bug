import { BallsType, MoveTextOrBall } from '../../sharedTypes/typesBall'
import { CardType, PlayerCard } from '../../sharedTypes/typesCard'
import { getCards } from '../../game/serverOutput'
import { Game } from '../../game/game'

import { Greedy } from '../bots/Greedy'
//import { Raindom } from '../bots/Raindom'

export type AiInterface = {
  choose: (data: AiData) => MoveTextOrBall
}

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
  tradedCard: CardType
  tradeDirection: number
  hadOneOrThirteen: boolean[]

  narrFlag: boolean[] // Should remove it in the future as we can include from traded cards
  narrTradedCards: CardType[]

  cardsWithMoves: PlayerCard[]
  discardPile: CardType[]
  overallUsedCards: CardType[]

  dealingPlayer: number

  activePlayer: number
  sevenChosenPlayer: number | null
  gameEnded: boolean
  winningTeams: boolean[]
}

function getAiData(game: Game, gamePlayer: number): AiData {
  return {
    nPlayers: game.nPlayers,
    teams: game.teams,
    coop: game.coop,
    meisterVersion: game.cards.meisterVersion,
    gamePlayer: gamePlayer,

    balls: game.balls,
    priorBalls: game.priorBalls,

    teufelFlag: game.teufelFlag,

    tradeFlag: game.tradeFlag,
    tradedCard: '', // TODO
    tradeDirection: game.tradeDirection,
    hadOneOrThirteen: [], // TODO

    narrFlag: game.narrFlag, // TODO
    narrTradedCards: [], // TODO

    cardsWithMoves: getCards(game, gamePlayer),
    discardPile: game.cards.discardPile,
    overallUsedCards: [], // TODO

    dealingPlayer: game.cards.dealingPlayer,

    activePlayer: game.activePlayer,
    sevenChosenPlayer: game.sevenChosenPlayer,
    gameEnded: game.gameEnded,
    winningTeams: game.winningTeams,
  }
}

export function getMovesFromCards(cards: PlayerCard[], gamePlayer: number): MoveTextOrBall[] {
  const moves: MoveTextOrBall[] = []

  for (const [cardIndex, card] of cards.entries()) {
    if (!card.possible) continue

    if (card.textAction != '') {
      card.textAction
        .split('+')
        .filter((a) => a != null && a.length > 0)
        .forEach((action) => {
          moves.push([gamePlayer, cardIndex, action])
        })
    }

    for (const ballIndex of Object.keys(card.ballActions)) {
      card.ballActions[Number(ballIndex)].forEach((action) => {
        moves.push([gamePlayer, cardIndex, Number(ballIndex), action])
      })
    }
  }

  return moves
}

const nSimulations = 1000
const simulations = [] as {
  status: 'waiting' | 'running' | 'finished' | 'error'
  moves: number
  simulationTime: number
}[]

for (let simulationIndex = 0; simulationIndex < nSimulations; simulationIndex++) {
  const start = performance.now()
  simulations.push({ status: 'running', moves: 0, simulationTime: 0 })

  try {
    const agents = [new Greedy(), new Greedy(), new Greedy(), new Greedy()]
    const game = new Game(4, 2, true, false)

    while (!game.gameEnded) {
      if (game.cards.players.every((p) => p.length === 0)) {
        game.performAction('dealCards', 0)
      }
      game.updateCardsWithMoves()

      let move: MoveTextOrBall | null = null
      for (let gamePlayer = 0; gamePlayer < game.nPlayers; gamePlayer++) {
        const cards = getCards(game, gamePlayer)
        const moves = getMovesFromCards(cards, gamePlayer)
        if (cards.length !== 0 && game.narrFlag.some((f) => f) && !game.narrFlag[gamePlayer]) moves.push([gamePlayer, 0, 'narr'])

        if (moves.length === 0) continue

        move = agents[gamePlayer].choose(getAiData(game, gamePlayer))
        break
      }

      if (move == null) {
        throw new Error('No move found')
      }
      if (!game.checkMove(move)) {
        throw new Error('Wrong move selected')
      }

      game.performAction(move, move[0])
      simulations[simulationIndex].moves = simulations[simulationIndex].moves + 1
    }

    simulations[simulationIndex].status = 'finished'
  } catch (err) {
    console.error(err)
    simulations[simulationIndex].status = 'error'
  } finally {
    simulations[simulationIndex].simulationTime = performance.now() - start
  }
}

console.log(simulations.filter((s) => s.status === 'error').length / simulations.length)

console.log(
  simulations
    .filter((s) => s.status === 'finished')
    .map((s) => s.simulationTime)
    .reduce((a, b) => a + b, 0) / simulations.length
)

console.log(
  simulations
    .filter((s) => s.status === 'finished')
    .map((s) => s.moves)
    .reduce((a, b) => a + b, 0) / simulations.length
)
