import { ballGoal, ballStart, getPositionsBetweenStarts } from '../../game/ballUtils'
import { BallsType } from 'src/sharedTypes/typesBall'

function necessaryForwardMovesToEndOfGoal(position: number, ballIndex: number, balls: BallsType): number {
  if (position < ballStart(0, balls)) return maxMovesToEndOfGoal(balls)
  if (position < ballGoal(0, balls)) {
    return ballStart(ballIndex, balls) > position
      ? ballStart(ballIndex, balls) - position + 4
      : ballStart(ballIndex, balls) + (balls.length / 4) * getPositionsBetweenStarts(balls) - position + 4
  }
  return ballGoal(ballIndex, balls) + 3 - position
}

function maxMovesToEndOfGoal(balls: BallsType): number {
  return (balls.length / 4) * getPositionsBetweenStarts(balls) + 4
}

export function normalizedNecessaryForwardMovesToEndOfGoal(position: number, ballIndex: number, balls: BallsType): number {
  return 1 - necessaryForwardMovesToEndOfGoal(position, ballIndex, balls) / maxMovesToEndOfGoal(balls)
}

export function ballInProximityOfHouse(position: number, ballIndex: number, balls: BallsType): number {
  if (position <= ballStart(ballIndex, balls) + 3 && position > ballStart(ballIndex, balls)) return 1
  if (necessaryForwardMovesToEndOfGoal(position, ballIndex, balls) <= 13 + 3) return 1
  return 0
}
