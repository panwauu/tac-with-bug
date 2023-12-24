import { BallsType, MoveTextOrBall } from '../../sharedTypes/typesBall'
import { CardType, PlayerCard } from '../../sharedTypes/typesCard'
import { getCards } from '../../game/serverOutput'
import { Game } from '../../game/game'

import { Greedy } from '../bots/Greedy'
//import { Raindom } from '../bots/Raindom'

export type AiInterface = {
  choose: (data: AiData) => MoveTextOrBall
}

export type AdditionalInformation = {
  hadOneOrThirteen: boolean[]
  tradedCards: (CardType | null)[]
  narrTradedCards: (CardType[] | null)[]
  previouslyUsedCards: CardType[]
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
  tradedCard: CardType | null
  tradeDirection: number
  hadOneOrThirteen: boolean[]

  narrTradedCards: CardType[] | null

  cardsWithMoves: PlayerCard[]
  discardPile: CardType[]
  overallUsedCards: CardType[]

  dealingPlayer: number

  activePlayer: number
  sevenChosenPlayer: number | null
}

function getAiData(game: Game, gamePlayer: number, additionalInformation: AdditionalInformation): AiData {
  return {
    nPlayers: game.nPlayers,
    teams: game.teams,
    coop: game.coop,
    meisterVersion: game.cards.meisterVersion,
    gamePlayer: gamePlayer, // TODO: shift

    balls: game.balls, // TODO: shift
    priorBalls: game.priorBalls, // TODO: shift

    teufelFlag: game.teufelFlag,

    tradeFlag: game.tradeFlag,
    tradedCard: additionalInformation.tradedCards[gamePlayer],
    tradeDirection: game.tradeDirection,
    hadOneOrThirteen: additionalInformation.hadOneOrThirteen, // TODO: shift

    narrTradedCards: additionalInformation.narrTradedCards[gamePlayer], // TODO: shift

    cardsWithMoves: getCards(game, gamePlayer), // TODO: shift
    discardPile: game.cards.discardPile,
    overallUsedCards: [...additionalInformation.previouslyUsedCards, ...game.cards.discardPile],

    dealingPlayer: game.cards.dealingPlayer, // TODO: shift

    activePlayer: game.activePlayer, // TODO: shift
    sevenChosenPlayer: game.sevenChosenPlayer, // TODO: shift
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

const nSimulations = 100
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
    const additionalInformation: AdditionalInformation = {
      hadOneOrThirteen: [],
      tradedCards: [null, null, null, null],
      narrTradedCards: [null, null, null, null],
      previouslyUsedCards: [],
    }

    while (!game.gameEnded) {
      if (game.cards.players.every((p) => p.length === 0)) {
        additionalInformation.previouslyUsedCards = additionalInformation.previouslyUsedCards.concat(game.cards.discardPile)
        if (game.cards.deck.length >= 98) {
          additionalInformation.previouslyUsedCards = []
        }
        game.performAction('dealCards', 0)
        additionalInformation.tradedCards = game.cards.players.map(() => null)
        additionalInformation.narrTradedCards = game.cards.players.map(() => null)
        additionalInformation.hadOneOrThirteen = game.cards.players.map((p) => p.some((c) => c === '1' || c === '13'))
      }
      game.updateCardsWithMoves()

      let move: MoveTextOrBall | null = null
      for (let gamePlayer = 0; gamePlayer < game.nPlayers; gamePlayer++) {
        const cards = getCards(game, gamePlayer)
        if (cards.length !== 0 && game.narrFlag.some((f) => f) && !game.narrFlag[gamePlayer]) {
          move = [gamePlayer, 0, 'narr']
          additionalInformation.narrTradedCards[gamePlayer] = game.cards.players[gamePlayer]
          break
        }
        if (cards.every((c) => !c.possible)) continue

        move = agents[gamePlayer].choose(getAiData(game, gamePlayer, additionalInformation))
        break
      }

      if (move == null) {
        throw new Error('No move found')
      }
      if (!game.checkMove(move)) {
        throw new Error('Wrong move selected')
      }

      if (move[2] === 'tauschen') {
        additionalInformation.tradedCards[move[0]] = game.cards.players[move[0]][move[1]]
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
