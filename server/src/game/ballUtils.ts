import type * as tBall from '../sharedTypes/typesBall'

import { ballInLastGoalPosition } from './performMoveUtils'

export function ballHome(nBall: number): number {
  //home: 0 + nPlayer * 4,
  return ballPlayer(nBall) * 4
}

export function ballStart(nBall: number, balls: tBall.BallsType): number {
  //start: 4 * nPlayers + nPlayer * positionsBetweenStarts,
  return balls.length + ballPlayer(nBall) * getPositionsBetweenStarts(balls)
}

export function ballGoal(nBall: number, balls: tBall.BallsType): number {
  //goal: 4 * nPlayers + nPlayers * positionsBetweenStarts + nPlayer * 4,
  return balls.length + (balls.length / 4) * getPositionsBetweenStarts(balls) + ballPlayer(nBall) * 4
}

export function getPositionsBetweenStarts(balls: tBall.BallsType): number {
  if (balls.length !== 16 && balls.length !== 24) {
    throw new Error('Wrong balls length')
  }

  if (balls.length === 16) {
    return 16
  }
  return 11
}

export function ballPlayer(nBall: number): number {
  return Math.floor(nBall / 4)
}

export function initializeBalls(nPlayers: number) {
  const balls: tBall.BallsType = []

  for (let nPlayer = 0; nPlayer < nPlayers; nPlayer++) {
    for (let i = 0; i < 4; i++) {
      balls.push({
        state: 'house',
        player: nPlayer,
        position: nPlayer * 4 + i,
      })
    }
  }

  return balls
}

export function resetBalls(balls: tBall.BallsType): void {
  balls.forEach((ball, index) => {
    if (ball.position < ballStart(0, balls)) {
      ball.state = 'house'
    } else if (ball.position === ballStart(0, balls)) {
      ball.state = 'invalid'
    } else if (ball.position < ballGoal(0, balls)) {
      ball.state = 'valid'
    } else {
      if (ballInLastGoalPosition(balls, index, ball.position)) {
        ball.state = 'locked'
      } else {
        ball.state = 'goal'
      }
    }
  })
}
