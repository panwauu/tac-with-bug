import * as tCard from '../sharedTypes/typesCard'
import * as tBall from '../sharedTypes/typesBall'

import { cloneDeep } from 'lodash'
import { moveOneStep } from './generateMovesUtils'
import { ballHome, ballGoal } from './ballUtils'

export function performBallAction(
  card: tCard.playerCard,
  nBall: number,
  newPosition: number,
  cardIndex: number,
  balls: tBall.ballsType,
  activePlayer: number,
  cards: tCard.cardsType,
  priorBalls: tBall.ballsType,
  teufelflag: boolean
): void {
  updatePriorBalls(card, balls, priorBalls)

  const lastNonTacCard = getLastNonTacCard(cards)

  if (card.title === 'trickser' || (card.title === 'tac' && lastNonTacCard === 'trickser')) {
    performTrickser(balls, nBall, newPosition)
  } else if ((card.title === 'krieger' || (card.title === 'tac' && lastNonTacCard === 'krieger')) && newPosition === balls[nBall].position) {
    moveBallToHouse(balls, nBall)
  } else {
    kickBalls(balls, card, newPosition, nBall, lastNonTacCard)

    const remainingMoves = getRemainingMoves(card, balls, nBall, newPosition, lastNonTacCard)

    updateState(balls, nBall, newPosition, remainingMoves)

    updateCardAfter7(card, cards, teufelflag, activePlayer, remainingMoves, cardIndex, lastNonTacCard)

    balls[nBall].position = newPosition
  }
}

// This function updates the PriorBalls in order for Tac to work
function updatePriorBalls(card: tCard.playerCard, balls: tBall.ballsType, priorBalls: tBall.ballsType): void {
  if (card.title === 'tac') {
    // If tac is player -> load priorballs
    const auxBalls = cloneDeep(balls)
    Object.assign(balls, cloneDeep(priorBalls))
    Object.assign(priorBalls, cloneDeep(auxBalls))
  } else if (card.title.substring(0, 3) === 'tac' && card.title.length > 3) {
    return
  } // If 7 was taced and is continued
  else if (card.title.substring(0, 2) === '7-') {
    return
  } // If 7 was played and is continued
  else {
    // Copy balls into priorBalls
    Object.assign(priorBalls, cloneDeep(balls))
  }
}

function performTrickser(balls: tBall.ballsType, nBall: number, newPosition: number): void {
  const nBallInDestination = balls.findIndex((ball) => {
    return ball.position === newPosition
  })
  balls[nBallInDestination].position = balls[nBall].position
  balls[nBallInDestination].state = 'valid'
  balls[nBall].position = newPosition
  balls[nBall].state = 'valid'
}

function kickBalls(balls: tBall.ballsType, card: tCard.playerCard, newPosition: number, nBall: number, lastNonTacCard: tCard.cardType | undefined): void {
  const nBallInDestination = balls.findIndex((ball) => {
    return ball.position === newPosition
  })
  if (nBallInDestination !== -1) {
    // move ball in goal position back to house
    moveBallToHouse(balls, nBallInDestination)
  }

  if (card.title[0] === '7' || (card.title.substring(0, 3) === 'tac' && lastNonTacCard === '7')) {
    // kick all balls inbetween if "7"
    moveBallsBetweenPositionsToHouse(balls, nBall, newPosition)
  }
}

export function ballInLastGoalPosition(balls: tBall.ballsType, nBall: number, newPosition: number): boolean {
  for (let pos = ballGoal(nBall, balls) + 3; pos > newPosition; pos = pos - 1) {
    if (
      !balls.some((ball, ballIndex) => {
        return ball.position === pos && ballIndex !== nBall
      })
    ) {
      return false
    }
  }
  return true
}

export function moveBallToHouse(balls: tBall.ballsType, nBall: number): void {
  let emptyHousePosition = -1
  for (let i = 0; i < 4; i++) {
    if (!balls.some((ball) => ball.position === ballHome(nBall) + i)) {
      emptyHousePosition = ballHome(nBall) + i
      break
    }
  }
  if (emptyHousePosition === -1) {
    throw new Error('Could not find House Position')
  }

  balls[nBall].position = emptyHousePosition
  balls[nBall].state = 'house'
}

function updateState(balls: tBall.ballsType, nBall: number, newPosition: number, remainingMoves: number): void {
  if (balls[nBall].state === 'house') {
    // just left house -> not allowed to enter goal area
    balls[nBall].state = 'invalid'
  } else if (balls[nBall].state === 'invalid') {
    // just left start position -> allowed to enter goal area
    balls[nBall].state = 'valid'
  } else if (newPosition >= ballGoal(nBall, balls)) {
    // ball is in goal
    if (remainingMoves === 0) {
      // move ended
      if (ballInLastGoalPosition(balls, nBall, newPosition)) {
        // is in last position -> locked
        balls[nBall].state = 'locked'
      } else {
        // is not in last position -> goal
        balls[nBall].state = 'goal'
      }
    } else {
      // move not ended - definitively seven
      if (newPosition === ballGoal(nBall, balls) && ballInLastGoalPosition(balls, nBall, newPosition)) {
        balls[nBall].state = 'locked'
        for (let i = 0; i < balls.length; i++) {
          if (balls[i].state !== 'locked' && ballInLastGoalPosition(balls, i, balls[i].position) && i !== nBall) {
            // is in last position -> locked
            balls[i].state = 'locked'
          }
        }
      } else {
        balls[nBall].state = 'goal'
      }
    }
  }

  lockBallsInGoal(balls, nBall, remainingMoves)
}

function lockBallsInGoal(balls: tBall.ballsType, nBall: number, remainingMoves: number) {
  if (remainingMoves === 0) {
    for (let i = 0; i < balls.length; i++) {
      if (balls[i].state !== 'locked' && ballInLastGoalPosition(balls, i, balls[i].position) && i !== nBall) {
        // is in last position -> locked
        balls[i].state = 'locked'
      }
    }
  }
}

function getRemainingMoves(card: tCard.playerCard, balls: tBall.ballsType, nBall: number, newPosition: number, lastNonTacCard: tCard.cardType | undefined): number {
  let remainingMoves = 0
  if (card.title[0] === '7' || (card.title.substring(0, 3) === 'tac' && lastNonTacCard === '7')) {
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

function updateCardAfter7(
  card: tCard.playerCard,
  cards: tCard.cardsType,
  teufelflag: boolean,
  activePlayerParam: number,
  remainingMoves: number,
  cardIndex: number,
  lastNonTacCard: tCard.cardType | undefined
) {
  let activePlayer = activePlayerParam

  if (card.title[0] === '7' || (card.title.substring(0, 3) === 'tac' && lastNonTacCard === '7')) {
    if (teufelflag) {
      activePlayer = (activePlayer + 1) % cards.players.length
    }

    if (remainingMoves > 0) {
      if (card.title[0] === '7') {
        cards.players[activePlayer][cardIndex] = `7-${remainingMoves.toString()}`
        card.title = '7-' + remainingMoves.toString()
      } else {
        cards.players[activePlayer][cardIndex] = 'tac-' + remainingMoves.toString()
        card.title = 'tac-' + remainingMoves.toString()
      }
    } else {
      if (card.title[0] === '7') {
        cards.players[activePlayer][cardIndex] = '7'
        card.title = '7'
      } else {
        cards.players[activePlayer][cardIndex] = 'tac'
        card.title = 'tac'
      }
    }

    if (teufelflag) {
      activePlayer = (activePlayer + cards.players.length - 1) % cards.players.length
    }
  }
}

export function getLastNonTacCard(cards: tCard.cardsType): string | undefined {
  for (let i = cards.discardPile.length - 1; i >= 0; i--) {
    if (cards.discardPile[i] !== 'tac' && (cards.discardPile[i] !== 'narr' || (cards.discardedFlag && i === cards.discardPile.length - 1))) {
      return cards.discardPile[i]
    }
  }
  return undefined
}

export function sevenReconstructPath(balls: tBall.ballsType, nBall: number, goalPosition: number): number[] {
  // Returns the path a ball with 7 can have used with start and End -> returns undefined if not possible
  let startPaths = [[balls[nBall].position]]
  const endPaths: number[][] = []
  let finalPath: number[] | undefined
  for (let move = 0; move < 7; move++) {
    for (let i = 0; i < startPaths.length; i++) {
      const oneStepPositions = moveOneStep(balls, nBall, startPaths[i][startPaths[i].length - 1], 1, 7)
      oneStepPositions.forEach((newPos) => {
        endPaths.push(startPaths[i].concat([newPos]))
      })
    }
    finalPath = endPaths.find((path) => path[path.length - 1] === goalPosition)
    if (finalPath != null) {
      break
    }
    startPaths = [...endPaths]
  }

  if (finalPath === undefined) {
    throw new Error('Could not reconstruct Path of 7')
  }
  return finalPath
}

export function moveBallsBetweenPositionsToHouse(balls: tBall.ballsType, nBall: number, goalPosition: number): void {
  // removes every ball between nBall.position and including goalPosition
  let finalPath = sevenReconstructPath(balls, nBall, goalPosition)
  finalPath = finalPath.slice(1, finalPath.length)

  finalPath.forEach((pos) => {
    const nBallToRemove = balls.findIndex((ball) => ball.position === pos)
    if (nBallToRemove !== -1) {
      moveBallToHouse(balls, nBallToRemove)
    }
  })
}
