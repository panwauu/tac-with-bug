import { CardType } from '../../sharedTypes/typesCard'
import { ballGoal, ballStart, getPositionsBetweenStarts } from '../../game/ballUtils'
import { BallsType } from '../../sharedTypes/typesBall'

function necessaryForwardMovesToEndOfGoal(position: number, ballIndex: number, balls: BallsType): number {
  if (position < ballStart(0, balls)) return maxMovesToEndOfGoal(balls)
  if (position < ballGoal(0, balls)) {
    return ballStart(ballIndex, balls) > position
      ? ballStart(ballIndex, balls) - position + 4
      : ballStart(ballIndex, balls) + (balls.length / 4) * getPositionsBetweenStarts(balls) - position + 4
  }
  return ballGoal(ballIndex, balls) + 3 - position
}

// Uff: WTF
// Problem: If ball is in goal the moves in between are not trivial
// Problem: Consider backward moves
export function necessaryCardToMoveToPosition(ballIndex: number, positionTo: number, balls: BallsType): CardType[] | null {
  ballIndex
  positionTo
  balls
  return null
}

export function movesBetweenTwoBallsInRing(positionFrom: number, positionTo: number, balls: BallsType): number {
  if (positionFrom < ballStart(0, balls) || positionTo < ballStart(0, balls)) throw new Error('One of the balls is not in the ring')
  if (positionFrom >= ballGoal(0, balls) || positionTo >= ballGoal(0, balls)) throw new Error('One of the balls is not in the ring')

  return positionFrom < positionTo ? positionFrom - positionTo : positionFrom + (balls.length / 4) * getPositionsBetweenStarts(balls) - positionTo
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
