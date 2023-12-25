import { BallsType, MoveTextOrBall } from '../../sharedTypes/typesBall'
import { CardType, PlayerCard } from '../../sharedTypes/typesCard'
import { getCards } from '../../game/serverOutput'
import { Game } from '../../game/game'
import { modulo, rightShiftArray } from '../normalize/helpers'
import { projectMoveToGamePlayer, rightShiftBalls, rightShiftCards } from '../normalize/normalize'

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
    tradedCard: additionalInformation.tradedCards[gamePlayer],
    tradeDirection: game.tradeDirection,
    hadOneOrThirteen: rightShiftArray(additionalInformation.hadOneOrThirteen, rightShiftBy),

    narrTradedCards: additionalInformation.narrTradedCards[gamePlayer],

    cardsWithMoves: rightShiftCards(game, getCards(game, gamePlayer), rightShiftBy),
    discardPile: game.cards.discardPile,
    overallUsedCards: [...additionalInformation.previouslyUsedCards, ...game.cards.discardPile],

    dealingPlayer: modulo(game.cards.dealingPlayer + game.nPlayers, game.nPlayers),

    activePlayer: modulo(game.activePlayer + game.nPlayers, game.nPlayers),
    sevenChosenPlayer: game.sevenChosenPlayer == null ? null : modulo(game.sevenChosenPlayer + game.nPlayers, game.nPlayers),
  }
}

export function getMovesFromCards(cards: PlayerCard[], gamePlayer: number): MoveTextOrBall[] {
  const moves: MoveTextOrBall[] = []

  for (const [cardIndex, card] of cards.entries()) {
    if (!card.possible) continue

    if (card.textAction !== '') {
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

const simulations = [] as {
  status: 'waiting' | 'running' | 'finished' | 'error'
  moves: number
  simulationTime: number
  winner: number | null
}[]

export function runSimulation(nSimulations: number, ais: AiInterface[], gameParameters?: { nPlayers: number; nTeams: number; coop: boolean; meisterVersion: boolean }) {
  if (ais.length !== (gameParameters?.nPlayers ?? 4)) {
    throw new Error('Need more agents')
  }

  for (let simulationIndex = 0; simulationIndex < nSimulations; simulationIndex++) {
    const start = performance.now()
    simulations.push({ status: 'running', moves: 0, simulationTime: 0, winner: null })

    try {
      const agents = ais // TODO fuck
      const game = new Game(gameParameters?.nPlayers ?? 4, gameParameters?.nTeams ?? 2, gameParameters?.meisterVersion ?? true, gameParameters?.coop ?? false)
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

          const aiData = getAiData(game, gamePlayer, additionalInformation)
          const agentMove = agents[gamePlayer].choose(aiData)
          move = projectMoveToGamePlayer(game, agentMove, gamePlayer)

          if (!game.checkMove(move)) {
            console.log('error')
          }
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
      simulations[simulationIndex].winner = game.winningTeams.findIndex((t) => t)
    } catch (err) {
      console.error(err)
      simulations[simulationIndex].status = 'error'
    } finally {
      simulations[simulationIndex].simulationTime = performance.now() - start
    }
  }

  console.log({
    faultRate: simulations.filter((s) => s.status === 'error').length / simulations.length,
    winRateTeam0: simulations.filter((s) => s.winner === 0).length / simulations.length,
    winRateTeam1: simulations.filter((s) => s.winner === 1).length / simulations.length,
    averageMoves: simulations.map((s) => s.moves).reduce((a, b) => a + b, 0) / simulations.length,
  })

  return simulations
}
