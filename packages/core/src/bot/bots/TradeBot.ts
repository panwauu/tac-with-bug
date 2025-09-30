import type { MoveBall, MoveText } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { ballInProximityOfHouse } from './utils'
import { initalizeStatistic } from '../../game/statistic'
import { Game } from '../../game/game'
import { ballGoal, ballHome, ballPlayer } from '../../game/ballUtils'
import { getDiscardScore } from './DiscardBot'
import { getMovesFromCards } from '../simulation/simulation'
import { getCards } from '../../game/serverOutput'

export function tradeBot(data: AiData, disallowedCards: number[]): MoveText {
  const tradeToPlayer = data.tradeDirection === 1 ? data.teams[0].at(1) : data.teams[0].at(-1)
  if (tradeToPlayer == null) throw new Error('Trade to player is null')

  let dataWithPossibleMoves = data
  if (disallowedCards.length !== 0) {
    dataWithPossibleMoves = structuredClone(data)
    for (const cardIndex of disallowedCards.toSorted((a, b) => b - a)) {
      dataWithPossibleMoves.cardsWithMoves.splice(cardIndex, 1)
    }
  }

  // 1) When i have a card that allows partner to go into goal
  // 2) When i have a card that allows partner to go into goal if another person moves their balls
  // 3) When partner has no 1/13 and
  //    i have >=2 or
  //    i have more balls in the ring
  //    we have the some number but he has more in proximity
  // 4) When i have a card that allows partner to kill enemy in proximity of goal
  // 5) When partner has to clean up his balls in the goal and i have a usefull card

  const move =
    tradeCardToMoveIntoGoal(dataWithPossibleMoves, tradeToPlayer, false) ??
    tradeCardToMoveIntoGoal(dataWithPossibleMoves, tradeToPlayer, true) ??
    tradeOneOrThirteen(dataWithPossibleMoves, tradeToPlayer) ??
    tradeKillEnemy(dataWithPossibleMoves, tradeToPlayer) ??
    tradeCleanUpCard(dataWithPossibleMoves, tradeToPlayer)

  if (move != null) {
    const allowedCardIndices = data.cardsWithMoves.map((_, i) => i).filter((i) => !disallowedCards.includes(i))
    return [move[0], allowedCardIndices[move[1]], move[2]]
  }

  const firstAllowedCardIndex = data.cardsWithMoves.findIndex((_, i) => !disallowedCards.includes(i))
  return [data.gamePlayer, firstAllowedCardIndex === -1 ? 0 : firstAllowedCardIndex, 'tauschen']
}

function getPossibleMovesOfPartner(data: AiData, tradeToPlayer: number, ignoreOtherBalls: boolean) {
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
      tradedCards: Array.from({ length: data.nPlayers }, () => null),
      narrFlag: Array.from({ length: data.nPlayers }, () => false),
      narrTradedCards: Array.from({ length: data.nPlayers }, () => null),
      activePlayer: tradeToPlayer,
      sevenChosenPlayer: data.sevenChosenPlayer,

      balls: data.balls.map((b, i) => {
        return !ignoreOtherBalls || b.player === tradeToPlayer
          ? b
          : {
              position: ballHome(ballPlayer(i)),
              player: b.player,
              state: 'house',
            }
      }),
      priorBalls: data.priorBalls,

      gameEnded: false,
      winningTeams: Array.from({ length: data.teams.length }, () => false),

      cards: {
        dealingPlayer: 0,
        discardPlayer: 0,
        discardedFlag: false,
        deck: [],
        discardPile: data.discardPile,
        players: Array.from({ length: data.nPlayers }, (_, i) => (i === tradeToPlayer ? data.cardsWithMoves.map((c) => c.title) : [])),
        meisterVersion: data.meisterVersion,
        hadOneOrThirteen: data.hadOneOrThirteen,
        previouslyPlayedCards: data.previouslyUsedCards,
      },
      cardsWithMoves: data.cardsWithMoves,

      statistic: initalizeStatistic(data.nPlayers),
      substitutedPlayerIndices: [],
    })
  )
  game.updateCardsWithMoves()

  return getMovesFromCards(getCards(game, tradeToPlayer), tradeToPlayer)
}

function tradeCardToMoveIntoGoal(data: AiData, tradeToPlayer: number, ignoreOtherBalls: boolean): MoveText | null {
  const moves = getPossibleMovesOfPartner(data, tradeToPlayer, ignoreOtherBalls)
  const filteredMoves = (moves.filter((m) => m.length === 4) as MoveBall[])
    .filter((m) => m[3] >= ballGoal(m[2], data.balls) && data.balls[m[2]].position < ballGoal(m[2], data.balls))
    .toSorted((a, b) => {
      const scoreA = getDiscardScore(data.cardsWithMoves[a[1]].title)
      const scoreB = getDiscardScore(data.cardsWithMoves[b[1]].title)
      const scoreDiff = scoreB - scoreA
      const movesFromEndA = ballGoal(a[2], data.balls) + 4 - a[3]
      const movesFromEndB = ballGoal(b[2], data.balls) + 4 - b[3]
      return scoreDiff === 0 ? movesFromEndA - movesFromEndB : scoreDiff
    })
  if (filteredMoves.length > 0) return [data.gamePlayer, filteredMoves[0][1], 'tauschen']
  return null
}

function tradeOneOrThirteen(data: AiData, tradeToPlayer: number): MoveText | null {
  const cardOneOrThirteenIndex = data.cardsWithMoves.findIndex((c) => c.title === '1' || c.title === '13')
  if (!data.hadOneOrThirteen[tradeToPlayer] && cardOneOrThirteenIndex !== -1) {
    const numberOfOwn1Or13 = data.cardsWithMoves.filter((c) => c.title === '1' || c.title === '13').length
    if (numberOfOwn1Or13 > 1) return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']

    const numberOfOwnBallsInRing = data.balls.filter((b) => b.player === data.gamePlayer && (b.state === 'valid' || b.state === 'invalid')).length
    const numberOfPartnerBallsInRing = data.balls.filter((b) => b.player === tradeToPlayer && (b.state === 'valid' || b.state === 'invalid')).length
    if (numberOfOwnBallsInRing > numberOfPartnerBallsInRing) return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']

    const numberOfOwnBallsInProximity = data.balls.filter((b, i) => b.player === data.gamePlayer && ballInProximityOfHouse(b.position, i, data.balls)).length
    const numberOfPartnerBallsInProximity = data.balls.filter((b, i) => b.player === tradeToPlayer && ballInProximityOfHouse(b.position, i, data.balls)).length
    if (numberOfOwnBallsInRing > 0 && numberOfOwnBallsInRing === numberOfPartnerBallsInRing && numberOfOwnBallsInProximity < numberOfPartnerBallsInProximity) {
      return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']
    }
  }
  return null
}

function tradeKillEnemy(data: AiData, tradeToPlayer: number): MoveText | null {
  const killingMoves = getPossibleMovesOfPartner(data, tradeToPlayer, false).filter(
    (m) =>
      m.length === 4 && data.balls.some((b, ballIndex) => b.position === m[3] && !data.teams[0].includes(b.player) && ballInProximityOfHouse(b.position, ballIndex, data.balls))
  )
  if (killingMoves.length > 0) {
    return [data.gamePlayer, killingMoves[0][1], 'tauschen']
  }
  return null
}

function tradeCleanUpCard(data: AiData, tradeToPlayer: number): MoveText | null {
  const moves = getPossibleMovesOfPartner(data, tradeToPlayer, false)
  const cleanupMoves = (moves.filter((m) => m.length === 4 && m[3] >= ballGoal(m[2], data.balls)) as MoveBall[]).toSorted((a, b) => {
    const scoreA = getDiscardScore(data.cardsWithMoves[a[1]].title)
    const scoreB = getDiscardScore(data.cardsWithMoves[b[1]].title)
    const scoreDiff = scoreB - scoreA
    const movesFromEndA = ballGoal(a[2], data.balls) + 4 - a[3]
    const movesFromEndB = ballGoal(b[2], data.balls) + 4 - b[3]
    return scoreDiff === 0 ? movesFromEndA - movesFromEndB : scoreDiff
  })
  if (cleanupMoves.length > 0) return [data.gamePlayer, cleanupMoves[0][1], 'tauschen']
  return null
}
