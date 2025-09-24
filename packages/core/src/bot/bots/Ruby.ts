// Hi, I'm ruby,
// I am a RUle-Based sYstem, hoping to be a good AI

import type { MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { type AiInterface, getMovesFromCards } from '../simulation/simulation'
import { ballInProximityOfHouse, normalizedNecessaryForwardMovesToEndOfGoal } from './utils'

export class Ruby implements AiInterface {
  choose(data: AiData) {
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)

    return moves.toSorted((m1, m2) => -getScoreFromMove(m1, data) + getScoreFromMove(m2, data))[0]
  }
}

function getScoreFromMove(move: MoveTextOrBall, data: AiData): number {
  return (
    1000 * ballIntoHouse(move) +
    100 * (move.length === 4 ? ballInProximityOfHouse(move[3], move[2], data.balls) : 0) +
    10 * killedEnemy(move, data) +
    1 * (move.length === 4 ? normalizedNecessaryForwardMovesToEndOfGoal(move[3], move[2], data.balls) : 0)
  )
}

function ballIntoHouse(move: MoveTextOrBall): number {
  if (move.length === 3) return 0
  return move[3] >= 80 ? 1 : 0
}

function killedEnemy(move: MoveTextOrBall, data: AiData): number {
  if (move.length === 3) return 0
  const ballToKill = data.balls.find((ball) => ball.position === move[3])
  if (ballToKill == null) return 0
  return ballToKill.player % 2 !== data.gamePlayer % 2 ? 1 : -1
}
