import type { BallActions, BallsType, MoveTextOrBall } from '../../types/ball'

import { Game } from '../../game/game'
import { ballGoal, ballStart, getPositionsBetweenStarts } from '../../game/ballUtils'
import { modulo, moduloOffset, rightShiftArray } from './helpers'
import type { PlayerCard } from '../../types/card'

function changePosition(gameInst: Game, position: number, playersShiftedBy: number) {
  const firstStartPosition = ballStart(0, gameInst.balls)
  const firstGoalPosition = ballGoal(0, gameInst.balls)
  if (position < firstStartPosition) {
    return modulo(position + playersShiftedBy * 4, firstStartPosition)
  } else if (position < firstGoalPosition) {
    return moduloOffset(position + playersShiftedBy * getPositionsBetweenStarts(gameInst.balls), firstGoalPosition, firstStartPosition)
  } else {
    return moduloOffset(position + playersShiftedBy * 4, firstStartPosition + firstGoalPosition, firstGoalPosition)
  }
}

export function rightShiftBalls(game: Game, balls: BallsType, rightShiftPlayersBy: number) {
  const shiftedBalls: BallsType = rightShiftArray(structuredClone(balls), rightShiftPlayersBy * 4)

  for (const shiftedBall of shiftedBalls) {
    shiftedBall.player = modulo(shiftedBall.player + rightShiftPlayersBy, game.nPlayers)
    shiftedBall.position = changePosition(game, shiftedBall.position, rightShiftPlayersBy)
  }

  return shiftedBalls
}

export function rightShiftCards(game: Game, cards: PlayerCard[], rightShiftPlayersBy: number) {
  const shiftedCards: PlayerCard[] = structuredClone(cards)

  for (const card of shiftedCards) {
    const newBallActions: BallActions = {}
    for (const ballIndex of Object.keys(card.ballActions)) {
      const shiftedBallIndex = modulo(Number(ballIndex) + rightShiftPlayersBy * 4, game.nPlayers * 4)
      newBallActions[shiftedBallIndex] = []
      card.ballActions[Number(ballIndex)].forEach((action) => {
        newBallActions[shiftedBallIndex].push(changePosition(game, action, rightShiftPlayersBy))
      })
    }
    card.ballActions = newBallActions
  }

  return shiftedCards
}

export function projectMoveToGamePlayer(game: Game, move: MoveTextOrBall, gamePlayer: number): MoveTextOrBall {
  const rightShiftBy = modulo(gamePlayer - move[0], game.nPlayers)

  if (move.length === 3) {
    return [gamePlayer, move[1], move[2]]
  }

  return [gamePlayer, move[1], modulo(move[2] + 4 * rightShiftBy, game.nPlayers * 4), changePosition(game, move[3], rightShiftBy)]
}
