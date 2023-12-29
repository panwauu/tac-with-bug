// Hi, I'm greedy,
// I care about nothing but about getting balls into the house

import { BallsType, MoveText, MoveTextOrBall } from '../../sharedTypes/typesBall'
import { AiData } from '../simulation/output'
import { previewMove } from '../simulation/previewMove'
import { AiInterface, getMovesFromCards } from '../simulation/simulation'
import { ballInProximityOfHouse, movesBetweenTwoBallsInRing, normalizedNecessaryForwardMovesToEndOfGoal } from './utils'

export class Futuro implements AiInterface {
  choose(data: AiData) {
    try {
      if (data.tradedCard == null) {
        return tradeBot(data)
      }

      const nodes = calculatePaths(data)
      if (nodes.length === 0) {
        const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
        return moves[Math.floor(Math.random() * moves.length)]
      }
      const sortedNodes = nodes.sort((p1, p2) => calculateScoreOfNode(p2) - calculateScoreOfNode(p1))

      return sortedNodes[0].movesToGetThere[0]
    } catch (e) {
      console.error('Could not calculate paths', e)
    }
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
    return moves[Math.floor(Math.random() * moves.length)]
  }
}

function tradeBot(data: AiData): MoveText {
  const tradeToPlayer = data.tradeDirection === 1 ? data.teams[0].at(1) : data.teams[0].at(-1)
  if (tradeToPlayer == null) throw new Error('Trade to player is null')

  // When i have a card that allows partner to go into goal
  // TODO

  // When partner has no 1/13 and
  //   i have >=2 or
  //   i have more balls in the ring
  //   we have the some number but he has more in proximity
  const cardOneOrThirteenIndex = data.cardsWithMoves.findIndex((c) => c.title === '1' || c.title === '13')
  if (!data.hadOneOrThirteen[tradeToPlayer] && cardOneOrThirteenIndex >= 0) {
    const numberOfOwn1Or13 = data.cardsWithMoves.filter((c) => c.title === '1' || c.title === '13').length
    if (numberOfOwn1Or13 > 1) return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']

    const numberOfOwnBallsInRing = data.balls.filter((b) => b.player === data.gamePlayer && (b.state === 'valid' || b.state === 'invalid')).length
    const numberOfPartnerBallsInRing = data.balls.filter((b) => b.player === tradeToPlayer && (b.state === 'valid' || b.state === 'invalid')).length
    if (numberOfOwnBallsInRing > numberOfPartnerBallsInRing) return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']

    const numberOfOwnBallsInProximity = data.balls.filter((b, i) => b.player === data.gamePlayer && ballInProximityOfHouse(b.position, i, data.balls)).length
    const numberOfPartnerBallsInProximity = data.balls.filter((b, i) => b.player === tradeToPlayer && ballInProximityOfHouse(b.position, i, data.balls)).length
    if (numberOfOwnBallsInRing > 0 && numberOfOwnBallsInRing === numberOfPartnerBallsInRing && numberOfOwnBallsInProximity < numberOfPartnerBallsInProximity)
      return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']
  }

  // When i have a card that allows partner to kill enemy in proximity of goal
  // TODO: Does not consider that there might be balls in between
  const partnerBallsInRing = data.balls.filter((b) => b.player === tradeToPlayer && (b.state === 'valid' || b.state === 'invalid'))
  const enemyBallsInProximity = data.balls.filter((b, i) => !data.teams[0].includes(b.player) && ballInProximityOfHouse(b.position, i, data.balls))
  if (partnerBallsInRing.length > 0 && enemyBallsInProximity.length > 0) {
    for (const ballToKill of enemyBallsInProximity) {
      for (const ballKiller of partnerBallsInRing) {
        const moves = movesBetweenTwoBallsInRing(ballKiller.position, ballToKill.position, data.balls)
        if (moves >= 1 && moves <= 13 && moves !== 4) {
          const cardIndex = data.cardsWithMoves.findIndex((c) => c.title === String(moves))
          if (cardIndex >= 0) return [data.gamePlayer, cardIndex, 'tauschen']
        }
      }
    }
  }

  // When partner has problems in house and i have 7 or 2/3 and it would help
  // TODO: Theroetically, we could have a better solution here and pass exactly the correct card
  if (data.balls.filter((b) => b.player === tradeToPlayer && b.state === 'goal').length > 0) {
    const cardSevenIndex = data.cardsWithMoves.findIndex((c) => c.title === '7')
    if (cardSevenIndex >= 0) return [data.gamePlayer, cardSevenIndex, 'tauschen']

    const cardTwoIndex = data.cardsWithMoves.findIndex((c) => c.title === '2')
    if (cardTwoIndex >= 0) return [data.gamePlayer, cardTwoIndex, 'tauschen']

    const cardThreeIndex = data.cardsWithMoves.findIndex((c) => c.title === '3')
    if (cardThreeIndex >= 0) return [data.gamePlayer, cardThreeIndex, 'tauschen']
  }

  return [data.gamePlayer, 0, 'tauschen']
}

function calculatePaths(data: AiData): EndNode[] {
  let nodes: EndNode[] = [{ state: data, movesToGetThere: [], scoresPerState: [] }]

  for (let i = 0; i < 3; i++) {
    const newNodes: EndNode[] = []
    for (const node of nodes) {
      newNodes.push(...expandNode(node))
    }
    nodes = newNodes
  }
  return nodes
}

function expandNode(node: EndNode): EndNode[] {
  if (node.state.teufelFlag) return []
  if (node.state.cardsWithMoves.some((c) => c.possible && c.textAction === 'tauschen')) return []

  if ((node.movesToGetThere.length != 0 && node.state.cardsWithMoves.length === 0) || node.state.cardsWithMoves.every((c) => !c.possible)) return [node]

  let moves = getMovesFromCards(node.state.cardsWithMoves, node.state.gamePlayer)
    .filter((m) => !['tac', '7', 'teufel', 'narr'].includes(node.state.cardsWithMoves[m[0]].title))
    .filter((m) => m.length === 4)

  // Filter moves from the same card as they are redundant
  const duplicatedCardIndices = node.state.cardsWithMoves
    .map((_, i) => i)
    .filter((i) => node.state.cardsWithMoves.map((c) => c.title).indexOf(node.state.cardsWithMoves[i].title) !== i)
  moves = moves.filter((m) => !duplicatedCardIndices.includes(m[1]))

  // Filter moves where the ball is moved from house
  moves = moves.reduce((filteredMoves, m) => {
    if (
      !(
        m.length === 4 &&
        node.state.balls[m[2]].state === 'house' &&
        filteredMoves.some((fm) => fm.length === 4 && node.state.balls[fm[2]].state === 'house' && fm[1] === m[1] && fm[3] === m[3])
      )
    )
      filteredMoves.push(m)
    return filteredMoves
  }, [] as MoveTextOrBall[])

  return moves.map((m) => {
    const dataAfterMove = previewMove(node.state, m)
    return {
      state: dataAfterMove,
      movesToGetThere: [...node.movesToGetThere, m],
      scoresPerState: [...node.scoresPerState, calculateScoreOfState(dataAfterMove)],
    }
  })
}

function calculateScoreOfState(data: AiData): number {
  // Sum of all teams for coop, difference of own team and enemy teams for non-coop
  return data.coop
    ? data.teams.reduce((sum, team) => sum + calculatePointsOfTeamFromBalls(data.balls, team), 0)
    : data.teams.reduce((sum, team, i) => sum + (i === 0 ? 1 : -1) * calculatePointsOfTeamFromBalls(data.balls, team), 0)
}

function calculatePointsOfTeamFromBalls(balls: BallsType, team: number[]): number {
  // + for balls in house
  // + for balls in proximity of house
  // + for moves to house required

  let score = 0
  balls.forEach((b, i) => {
    if (team.includes(b.player)) {
      if (b.state === 'goal' || b.state === 'locked') score += 100
      if (b.state === 'valid' && ballInProximityOfHouse(b.position, i, balls)) score += 10
      score += normalizedNecessaryForwardMovesToEndOfGoal(b.position, i, balls)
    }
  })

  return score
}

type EndNode = { state: AiData; movesToGetThere: MoveTextOrBall[]; scoresPerState: number[] }

function calculateScoreOfNode(node: EndNode) {
  return node.scoresPerState.map((n, i) => n * Math.pow(0.5, node.movesToGetThere.length - i - 1)).reduce((sum, score) => sum + score, 0)
}
