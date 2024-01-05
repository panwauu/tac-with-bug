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

function maxMovesToEndOfGoal(balls: BallsType): number {
  return (balls.length / 4) * getPositionsBetweenStarts(balls) + 4
}

export function normalizedNecessaryForwardMovesToEndOfGoal(position: number, ballIndex: number, balls: BallsType): number {
  return 1 - necessaryForwardMovesToEndOfGoal(position, ballIndex, balls) / maxMovesToEndOfGoal(balls)
}

export function ballInProximityOfHouse(position: number, ballIndex: number, balls: BallsType): number {
  if (ballInBackwardProximity(position, ballIndex, balls) || ballInForward7Proximity(position, ballIndex, balls) || ballInForwardProximity(position, ballIndex, balls)) return 1
  return 0
}

// Ball could be moved into goal with a 7 assuming no other balls
export function ballInForward7Proximity(position: number, ballIndex: number, balls: BallsType): boolean {
  return necessaryForwardMovesToEndOfGoal(position, ballIndex, balls) <= 7 + 3
}

// Ball could be moved into goal with a forward moving card assuming no other balls
export function ballInForwardProximity(position: number, ballIndex: number, balls: BallsType): boolean {
  return necessaryForwardMovesToEndOfGoal(position, ballIndex, balls) <= 13 + 3
}

// Ball could be moved into goal with -4 assuming no other balls
export function ballInBackwardProximity(position: number, ballIndex: number, balls: BallsType): boolean {
  return position <= ballStart(ballIndex, balls) + 3 && position >= ballStart(ballIndex, balls) && balls[ballIndex].state === 'valid'
}
