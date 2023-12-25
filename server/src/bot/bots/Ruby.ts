// Hi, I'm ruby,
// I am a RUle-Based sYstem, hoping to be a good AI

import { ballStart, getPositionsBetweenStarts } from '../../game/ballUtils'
import { MoveBall, MoveTextOrBall } from '../../sharedTypes/typesBall'
import { AiData, AiInterface, getMovesFromCards } from '../simulation/simulation'

export class Ruby implements AiInterface {
  choose(data: AiData) {
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)

    return moves.sort((m1, m2) => -getScoreFromMove(m1, data) + getScoreFromMove(m2, data))[0]
  }
}

function getScoreFromMove(move: MoveTextOrBall, data: AiData): number {
  return 1000 * ballIntoHouse(move) + 100 * ballInProximityOfHouse(move, data) + 10 * killedEnemy(move, data) + 1 * movesToHouse(move, data)
}

function ballIntoHouse(move: MoveTextOrBall): number {
  if (move.length === 3) return 0
  return move[3] >= 80 ? 1 : 0
}

function ballInProximityOfHouse(move: MoveTextOrBall, data: AiData): number {
  if (move.length === 3) return 0
  if (move[3] <= ballStart(move[2], data.balls) + 3 && move[3] > ballStart(move[2], data.balls)) return 1
  if (necessaryMovesToHouse(move, data) < 13) return 1
  return 0
}

function killedEnemy(move: MoveTextOrBall, data: AiData): number {
  if (move.length === 3) return 0
  const ballToKill = data.balls.find((ball) => ball.position === move[3])
  if (ballToKill == null) return 0
  return ballToKill.player % 2 !== data.gamePlayer % 2 ? 1 : -1
}

function movesToHouse(move: MoveTextOrBall, data: AiData): number {
  if (move.length === 3) return 0
  return 1 - necessaryMovesToHouse(move, data) / (data.nPlayers * getPositionsBetweenStarts(data.balls))
}

function necessaryMovesToHouse(move: MoveBall, data: AiData): number {
  return ballStart(move[2], data.balls) > move[3]
    ? ballStart(move[2], data.balls) - move[3] + 1
    : ballStart(move[2], data.balls) + data.nPlayers * getPositionsBetweenStarts(data.balls) - move[3] + 1
}
