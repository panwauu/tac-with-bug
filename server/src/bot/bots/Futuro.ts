// Hi, I'm greedy,
// I care about nothing but about getting balls into the house

import { BallsType, MoveTextOrBall } from '../../sharedTypes/typesBall'
import { previewMove } from '../simulation/previewMove'
import { AiData, AiInterface, getMovesFromCards } from '../simulation/simulation'
import { ballInProximityOfHouse, normalizedNecessaryForwardMovesToEndOfGoal } from './utils'

export class Futuro implements AiInterface {
  choose(data: AiData) {
    try {
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

function calculatePaths(data: AiData): EndNode[] {
  let nodes: EndNode[] = [{ state: data, movesToGetThere: [], scoresPerState: [] }]

  for (let i = 0; i < 3; i++) {
    const newNodes: EndNode[] = []
    for (let node of nodes) {
      newNodes.push(...expandNode(node))
    }
    nodes = newNodes
  }
  return nodes
}

function expandNode(node: EndNode): EndNode[] {
  // Ignore "tauschen" TODO
  // Ignore narr, teufel, tac
  // Problem with 7 or tacced 7?

  if (node.state.teufelFlag) {
    return []
  }

  let moves = getMovesFromCards(node.state.cardsWithMoves, node.state.gamePlayer)
  moves = moves.filter((m) => !['tac', '7', 'teufel', 'narr'].includes(node.state.cardsWithMoves[m[0]].title)).filter((m) => m.length === 4)
  if (moves.some((m) => m.length === 3 && m[2] === 'tauschen')) {
    return []
  }
  if (moves.length === 0 && node.movesToGetThere.length !== 0) {
    return [node]
  }

  const result = moves.map((m) => {
    const dataAfterMove = previewMove(node.state, m)
    return structuredClone({
      state: dataAfterMove,
      movesToGetThere: [...node?.movesToGetThere, m],
      scoresPerState: [...node?.scoresPerState, calculateScoreOfState(dataAfterMove)],
    })
  })
  return result
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
      if (b.state === 'goal' || b.state === 'locked') score += 1000
      if (b.state === 'valid' && ballInProximityOfHouse(b.position, i, balls)) score += 100
      score += normalizedNecessaryForwardMovesToEndOfGoal(b.position, i, balls)
    }
  })

  return score
}

type EndNode = { state: AiData; movesToGetThere: MoveTextOrBall[]; scoresPerState: number[] }

function calculateScoreOfNode(node: EndNode) {
  return node.scoresPerState.map((n, i) => n * Math.pow(0.5, node.movesToGetThere.length - i - 1)).reduce((sum, score) => sum + score, 0)
}
