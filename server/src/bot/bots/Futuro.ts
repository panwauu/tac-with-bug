// Hi, I'm futuro,
// I look into the future and plan my moves accordingly

import { ballGoal } from '../../game/ballUtils'
import { BallsType, MoveText, MoveTextOrBall } from '../../sharedTypes/typesBall'
import { AiData, getAiData } from '../simulation/output'
import { convertDataToGameAsIf0WasActive, previewMove } from '../simulation/previewMove'
import { AiInterface, getMovesFromCards } from '../simulation/simulation'
import { discardBot } from './DiscardBot'
import { tradeBot } from './TradeBot'
import { ballInBackwardProximity, ballInForward7Proximity, ballInForwardProximity, ballInProximityOfHouse, normalizedNecessaryForwardMovesToEndOfGoal } from './utils'

const cutOfNodes = 100
const movesIntoTheFuture = 6

export class Futuro implements AiInterface {
  choose(data: AiData) {
    try {
      if (data.tradedCard == null) {
        const dataAsIf0WereActive = getAiData(convertDataToGameAsIf0WasActive(data), 0)
        const nodes = calculatePaths(dataAsIf0WereActive, 3)
        const preferedNode = nodes.toSorted((p1, p2) => calculateScoreOfNode(p2) - calculateScoreOfNode(p1)).at(0)
        if (preferedNode != null) {
          if (playingOnLastBall(data) && preferedNode.state.balls.filter((b) => b.state === 'locked').length === preferedNode.state.teams[0].length * 4) {
            if (partnerPlayingFirst(data) && preferedNode.usedCardIndices.length >= 1) {
              return [0, preferedNode.usedCardIndices[0], 'tauschen'] as MoveText
            } else if (!partnerPlayingFirst(data) && preferedNode.usedCardIndices.length >= 2) {
              return [0, preferedNode.usedCardIndices[1], 'tauschen'] as MoveText
            }
          }

          const scoreBefore = calculateScoreOfState(data)
          const lastMoveIndexWithMoveBallIntoGoal = preferedNode.scoresPerState.findLastIndex(
            (score, i) => score > (i === 0 ? scoreBefore : preferedNode.scoresPerState[i - 1]) + 999
          )
          if (lastMoveIndexWithMoveBallIntoGoal !== -1) {
            return tradeBot(
              data,
              preferedNode.usedCardIndices.slice(0, lastMoveIndexWithMoveBallIntoGoal + 1).filter((i) => i !== -1)
            )
          }
        }
        return tradeBot(data, [])
      }
      const discardMove = discardBot(data)
      if (discardMove != null) return discardMove

      const nodes = calculatePaths(data, movesIntoTheFuture)
      if (nodes.length > 0) {
        // Teufel: always if next player is close to goal
        const possibleInitialMoves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
        const teufelMoveIndex = possibleInitialMoves.findIndex((m) => m[2] === 'teufel')
        if (
          teufelMoveIndex !== -1 &&
          data.balls.filter((b, i) => ballInProximityOfHouse(b.position, i, data.balls)).some((b) => b.player === (data.gamePlayer + 1) % data.nPlayers)
        ) {
          return possibleInitialMoves[teufelMoveIndex]
        }

        const sortedNodes = nodes.toSorted((p1, p2) => calculateScoreOfNode(p2) - calculateScoreOfNode(p1))

        // Aussetzen or Narr: if last score is worse than current state
        const aussetzenMoveIndex = possibleInitialMoves.findIndex((m) => m.length === 3 && m[2].includes('aussetzen'))
        const narrMoveIndex = possibleInitialMoves.findIndex((m) => m.length === 3 && m[2].includes('narr'))
        if ((sortedNodes[0].scoresPerState.at(-1) ?? Infinity) < calculateScoreOfState(data)) {
          if (aussetzenMoveIndex !== -1) return possibleInitialMoves[aussetzenMoveIndex]
          if (narrMoveIndex !== -1) return possibleInitialMoves[narrMoveIndex]
        }

        // Select the best move
        return sortedNodes[0].movesToGetThere[0]
      }
    } catch (e) {
      console.error('Problems during search of possible moves', e)
    }

    // Fallback: Choose random
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
    return moves[Math.floor(Math.random() * moves.length)]
  }
}

type EndNode = { state: AiData; movesToGetThere: MoveTextOrBall[]; scoresPerState: number[]; forbiddenBalls: number[]; usedCardIndices: number[] }

function calculatePaths(data: AiData, numberOfSteps: number): EndNode[] {
  let nodes: EndNode[] = [{ state: data, movesToGetThere: [], scoresPerState: [], forbiddenBalls: [], usedCardIndices: [] }]

  for (let i = 0; i < numberOfSteps; i++) {
    const newNodes: EndNode[] = []
    for (const node of nodes) {
      newNodes.push(...expandNode(node))
    }
    nodes = newNodes.toSorted((p1, p2) => calculateScoreOfNode(p2) - calculateScoreOfNode(p1)).slice(0, cutOfNodes)
  }
  return nodes
}

function expandNode(node: EndNode): EndNode[] {
  if (node.state.teufelFlag) return []
  if (node.state.cardsWithMoves.some((c) => c.possible && c.textAction === 'tauschen')) return []

  // Terminal node
  if ((node.movesToGetThere.length !== 0 && node.state.cardsWithMoves.length === 0) || node.state.cardsWithMoves.every((c) => !c.possible)) return [node]

  let moves = getMovesFromCards(node.state.cardsWithMoves, node.state.gamePlayer)
    .filter((m) => node.state.cardsWithMoves[m[1]].title !== 'tac' || node.movesToGetThere.length === 0)
    .filter((m) => !['teufel', 'narr'].includes(node.state.cardsWithMoves[m[0]].title) && m[2] !== 'teufel' && m[2] !== 'teufel')
    .filter((m) => m.length === 3 || !node.state.cardsWithMoves[m[1]].title.includes('-') || !node.forbiddenBalls.includes(m[2]))

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
    ) {
      filteredMoves.push(m)
    }
    return filteredMoves
  }, [] as MoveTextOrBall[])

  return moves.map((m) => {
    const dataAfterMove = previewMove(node.state, m)
    return {
      state: dataAfterMove,
      movesToGetThere: [...node.movesToGetThere, m],
      scoresPerState: [...node.scoresPerState, calculateScoreOfState(dataAfterMove)],
      forbiddenBalls: getForbiddenMoves(node, m),
      usedCardIndices: [...node.usedCardIndices, getUsedCardIndex(node, m)],
    }
  })
}

function getUsedCardIndex(node: EndNode, m: MoveTextOrBall) {
  if (node.state.cardsWithMoves[m[1]].title.includes('-')) return -1
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !node.usedCardIndices.includes(i)).at(m[1]) ?? -2
}

function getForbiddenMoves(node: EndNode, move: MoveTextOrBall) {
  if (move.length === 3) return []
  if (node.state.cardsWithMoves[move[1]].title.includes('-') && ballGoal(0, node.state.balls) <= move[3]) return [...node.forbiddenBalls]
  if (node.state.cardsWithMoves[move[1]].title.includes('-') && ballGoal(0, node.state.balls) > move[3]) return [...node.forbiddenBalls, move[2]]
  if (node.state.cardsWithMoves[move[1]].title === '7' && ballGoal(0, node.state.balls) > move[3]) return [move[2]]
  if (node.state.cardsWithMoves[move[1]].title === '7' && ballGoal(0, node.state.balls) <= move[3]) return []
  return []
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
  // + for locked balls to incentivize clearing the goal entry
  // + for balls in the ring to incentivize moving them from the house
  // + for moves to house required

  let score = 0
  balls.forEach((b, i) => {
    if (team.includes(b.player)) {
      if (b.state === 'goal' || b.state === 'locked') score += 1000
      if (ballInForward7Proximity(b.position, i, balls)) score += 11
      if (ballInForwardProximity(b.position, i, balls)) score += 10
      if (ballInBackwardProximity(b.position, i, balls)) score += 9
      if (b.state === 'locked') score += 5
      if (b.state === 'invalid' || b.state === 'valid') score += 1
      score += normalizedNecessaryForwardMovesToEndOfGoal(b.position, i, balls)
    }
  })

  return score
}

function calculateScoreOfNode(node: EndNode) {
  return node.scoresPerState.reduce((sum, score) => sum + score / node.scoresPerState.length, 0)
}

function playingOnLastBall(data: AiData) {
  return data.balls.filter((b) => data.teams[0].includes(b.player) && b.state === 'locked').length >= data.balls.filter((b) => data.teams[0].includes(b.player)).length - 1
}

function partnerPlayingFirst(data: AiData) {
  const tradeToPlayer = (data.tradeDirection === 1 ? data.teams[0].at(1) : data.teams[0].at(-1)) ?? 2
  return data.activePlayer > data.gamePlayer && data.activePlayer <= tradeToPlayer
}
