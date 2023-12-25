import type { BallActions, BallsType, MoveTextOrBall } from '../../sharedTypes/typesBall'

import { cloneDeep } from 'lodash'
import { Game } from '../../game/game'
import { ballGoal, ballStart, getPositionsBetweenStarts } from '../../game/ballUtils'
import { modulo, moduloOffset, reorderArray, rightShiftArray } from './helpers'
import { PlayerCard } from 'src/sharedTypes/typesCard'

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

export function rightShiftPlayers(gameInst: Game, shiftBy: number) {
  if (Math.abs(shiftBy) === 0) {
    return 0
  }

  gameInst.activePlayer = modulo(gameInst.activePlayer + shiftBy, gameInst.nPlayers)
  gameInst.sevenChosenPlayer = gameInst.sevenChosenPlayer != null ? modulo(gameInst.sevenChosenPlayer + shiftBy, gameInst.nPlayers) : null

  gameInst.balls = rightShiftArray(gameInst.balls, shiftBy * 4)
  gameInst.priorBalls = rightShiftArray(gameInst.priorBalls, shiftBy * 4)
  for (let ballIndex = 0; ballIndex < gameInst.balls.length; ballIndex++) {
    gameInst.balls[ballIndex].player = modulo(gameInst.balls[ballIndex].player + shiftBy, gameInst.nPlayers)
    gameInst.balls[ballIndex].position = changePosition(gameInst, gameInst.balls[ballIndex].position, shiftBy)
    gameInst.priorBalls[ballIndex].player = modulo(gameInst.priorBalls[ballIndex].player + shiftBy, gameInst.nPlayers)
    gameInst.priorBalls[ballIndex].position = changePosition(gameInst, gameInst.priorBalls[ballIndex].position, shiftBy)
  }

  gameInst.cards.dealingPlayer = modulo(gameInst.cards.dealingPlayer + shiftBy, gameInst.nPlayers)
  gameInst.cards.players = rightShiftArray(gameInst.cards.players, shiftBy)

  return shiftBy
  // (narrFlag, winningTeams) -> Ignore for now
  // statistic, teams, tradeCards -> Ignore always
}

export function reorderBalls(gameInst: Game, playersShiftedBy: number) {
  const localOrder = gameInst.balls.map((_, i) => i)
  for (let i = 0; i < gameInst.nPlayers; i++) {
    const subOrder = localOrder.splice(i * 4, 4).sort(function (left: number, right: number) {
      return gameInst.balls[left].position < gameInst.balls[right].position ? -1 : 1
    })
    localOrder.splice(i * 4, 0, ...subOrder)
  }

  gameInst.balls = reorderArray(gameInst.balls, localOrder)
  gameInst.priorBalls = reorderArray(gameInst.priorBalls, localOrder)

  return reorderArray(
    rightShiftArray(
      gameInst.balls.map((_, i) => i),
      playersShiftedBy * 4
    ),
    localOrder
  )
}

export function reorderCards(gameInst: Game) {
  const cardsNewOrder = gameInst.cards.players[0]
    .map((_, i) => i)
    .sort(function (left: number, right: number) {
      return gameInst.cards.players[0][left] < gameInst.cards.players[0][right] ? -1 : 1
    })

  gameInst.cards.players[0] = reorderArray(gameInst.cards.players[0], cardsNewOrder)

  return cardsNewOrder
}

export function normalizeGame(gameInst: Game, playerIndex: number): { game: Game; playersShiftedBy: number; ballsNewOrder: number[]; cardsNewOrder: number[] } {
  const newGame = new Game(gameInst.nPlayers, gameInst.teams.length, gameInst.cards.meisterVersion, gameInst.coop, cloneDeep(gameInst))

  const playersShiftedBy = rightShiftPlayers(newGame, -1 * playerIndex)
  const ballsNewOrder = reorderBalls(newGame, playersShiftedBy)
  const cardsNewOrder = reorderCards(newGame)

  newGame.updateCardsWithMoves()

  return { game: newGame, playersShiftedBy, ballsNewOrder, cardsNewOrder }
}

export function normalizeAction(action: MoveTextOrBall, norm: { game: Game; cardsNewOrder: number[]; ballsNewOrder: number[]; playersShiftedBy: number }): MoveTextOrBall {
  const reorderedCardIndex = norm.cardsNewOrder.findIndex((i) => i === action[1])
  if (reorderedCardIndex === -1) {
    throw new Error('Could not norm Action')
  }
  const card = norm.game.cards.players[0][reorderedCardIndex]
  const cardIndexNormalized = norm.game.cards.players[0].findIndex((c) => c === card)

  if (action.length === 3) {
    return [0, cardIndexNormalized, action[2]]
  }
  const ballIndex = norm.ballsNewOrder.findIndex((i) => i === action[2])
  return [0, cardIndexNormalized, ballIndex, changePosition(norm.game, action[3], norm.playersShiftedBy)]
}

export function unnormalizeAction(normAction: MoveTextOrBall, norm: { game: Game; cardsNewOrder: number[]; ballsNewOrder: number[]; playersShiftedBy: number }): MoveTextOrBall {
  const playerIndex = norm.playersShiftedBy === 0 ? 0 : -1 * norm.playersShiftedBy
  const cardIndex = norm.cardsNewOrder[normAction[1]]
  if (normAction.length === 3) {
    return [playerIndex, cardIndex, normAction[2]]
  }
  const ballIndex = norm.ballsNewOrder[normAction[2]]
  return [playerIndex, cardIndex, ballIndex, changePosition(norm.game, normAction[3], -1 * norm.playersShiftedBy)]
}

export function rightShiftBalls(game: Game, balls: BallsType, rightShiftBy: number) {
  const shiftedBalls: BallsType = rightShiftArray(structuredClone(balls), rightShiftBy * 4)

  for (let ballIndex = 0; ballIndex < shiftedBalls.length; ballIndex++) {
    shiftedBalls[ballIndex].player = modulo(shiftedBalls[ballIndex].player + rightShiftBy, game.nPlayers)
    shiftedBalls[ballIndex].position = changePosition(game, shiftedBalls[ballIndex].position, rightShiftBy)
  }

  return shiftedBalls
}

export function rightShiftCards(game: Game, cards: PlayerCard[], rightShiftBy: number) {
  const shiftedCards: PlayerCard[] = structuredClone(cards)

  for (const card of shiftedCards) {
    const newBallActions: BallActions = {}
    for (const ballIndex of Object.keys(card.ballActions)) {
      const shiftedBallIndex = modulo(Number(ballIndex) + rightShiftBy * 4, game.nPlayers * 4)
      newBallActions[shiftedBallIndex] = []
      card.ballActions[Number(ballIndex)].forEach((action) => {
        newBallActions[shiftedBallIndex].push(changePosition(game, action, rightShiftBy))
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
