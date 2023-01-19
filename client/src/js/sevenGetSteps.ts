import type * as tBall from '@/../../server/src/sharedTypes/typesBall'
import type * as tCard from '../@types/typesCard'
import type { DiscardElement } from '@/services/compositionGame/useDiscardPile'

export function getRemainingMoves(card: tCard.PlayerCard, balls: tBall.BallsType, nBall: number, newPosition: number, discardPile: DiscardElement[]): number {
  const lastNonTacCard = getLastNonTacCard(discardPile)

  let remainingMoves = 0
  if (card.title?.[0] === '7' || (card.title?.substring(0, 3) === 'tac' && lastNonTacCard?.cardTitle === 'sieben')) {
    // reset all balls inbetween if "7"
    let priorRemainingMoves = 7
    if (card.title.substring(0, 2) === '7-') {
      priorRemainingMoves = parseInt(card.title.substring(2, card.title.length))
    }
    if (card.title.substring(0, 3) === 'tac' && card.title.length > 3) {
      priorRemainingMoves = parseInt(card.title.substring(4, card.title.length))
    }
    remainingMoves = priorRemainingMoves - (sevenReconstructPath(balls, nBall, newPosition).length - 1)
  }
  return remainingMoves
}

function getLastNonTacCard(discardPile: DiscardElement[]): DiscardElement | undefined {
  for (let i = discardPile.length - 1; i >= 0; i--) {
    if (discardPile[i].cardTitle !== 'tac' && discardPile[i].cardTitle !== 'narr') {
      return discardPile[i]
    }
  }
  return undefined
}
function sevenReconstructPath(balls: tBall.BallsType, nBall: number, goalPosition: number) {
  // Returns the path a ball with 7 can have used with start and End -> returns undefined if not possible
  let startPaths = [[balls[nBall].position]]
  const endPaths: number[][] = []
  let finalPath: number[] | undefined
  for (let move = 0; move < 7; move++) {
    for (const startPath of startPaths) {
      const oneStepPositions = moveOneStep(balls, nBall, startPath[startPath.length - 1], 1, 7)
      oneStepPositions.forEach((newPos) => {
        endPaths.push(startPath.concat([newPos]))
      })
    }
    finalPath = endPaths.find((path) => path[path.length - 1] === goalPosition)
    if (finalPath != null) {
      break
    }
    startPaths = [...endPaths]
  }
  if (finalPath === undefined) {
    throw 'Could not reconstruct Path of 7'
  }
  return finalPath
}

function moveOneStep(balls: tBall.BallsType, nBall: number, ballPosition: number, direction: number, cardNumber: number) {
  if (ballPosition < ballStart(0, balls)) {
    return []
  }

  const resultingPositions = []
  if (direction === 1) {
    // FORWARD MOVEMENT
    if (
      ballPosition === ballStart(nBall, balls) && // move into goal if allowed
      balls[nBall].state === 'valid'
    ) {
      resultingPositions.push(ballGoal(nBall, balls))
    }
    // perform ordinary move
    if (ballPosition < ballGoal(0, balls)) {
      // not in goal
      if (ballPosition === ballGoal(0, balls) - 1) {
        resultingPositions.push(ballStart(0, balls))
      } // close circle
      else {
        resultingPositions.push(ballPosition + 1)
      }
    } else {
      // in goal
      if (cardNumber === 7) {
        if ((balls[nBall].state === 'goal' || balls[nBall].state === 'valid') && ballPosition !== ballGoal(nBall, balls) + 3) {
          resultingPositions.push(ballPosition + 1)
        }
        if (balls[nBall].state === 'goal' && ballPosition !== ballGoal(nBall, balls)) {
          resultingPositions.push(ballPosition - 1)
        }
      } else {
        // move if not in end
        if (ballPosition < ballGoal(nBall, balls) + 3) {
          resultingPositions.push(ballPosition + 1)
        }
      }
    }
  } else {
    // BACKWARDS MOVEMENT - only possible with -4
    if (
      ballPosition === ballStart(nBall, balls) && // move into goal if not first move
      balls[nBall].state === 'valid'
    ) {
      resultingPositions.push(ballGoal(nBall, balls))
    }
    if (
      ballPosition >= ballGoal(0, balls) && // move in house
      ballPosition < ballGoal(nBall, balls) + 3
    ) {
      resultingPositions.push(ballPosition + 1)
    } else {
      // move in circle
      if (ballPosition === ballStart(0, balls)) {
        resultingPositions.push(ballGoal(0, balls) - 1)
      } // close circle
      else {
        resultingPositions.push(ballPosition - 1)
      } // default
    }
  }
  return resultingPositions
}

function ballStart(nBall: number, balls: tBall.BallsType) {
  //start: 4 * nPlayers + nPlayer * positionsBetweenStarts,
  return balls.length + ballPlayer(nBall) * getPositionsBetweenStarts(balls)
}
function ballGoal(nBall: number, balls: tBall.BallsType) {
  //goal: 4 * nPlayers + nPlayers * positionsBetweenStarts + nPlayer * 4,
  return balls.length + (balls.length / 4) * getPositionsBetweenStarts(balls) + ballPlayer(nBall) * 4
}
function getPositionsBetweenStarts(balls: tBall.BallsType) {
  if (balls.length !== 16 && balls.length !== 24) {
    throw 'Wrong balls length'
  }
  if (balls.length === 16) {
    return 16
  }
  return 11
}
function ballPlayer(nBall: number) {
  return Math.floor(nBall / 4)
}
