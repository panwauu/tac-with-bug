import { reactive } from 'vue'
import { cloneDeep } from 'lodash'

import type * as tBall from '@/../../server/src/sharedTypes/typesBall'
import type { CardsStateType } from './useCards'

export interface BallsStateType {
  balls: tBall.BallsType
  priorBalls: tBall.BallsType
  selectedBall: number
  playableBalls: tBall.BallActions
  updateBallsState: (balls: tBall.BallsType, priorBalls: tBall.BallsType) => void
  setPlayableBalls: (playableBalls: tBall.BallActions) => void
  resetPlayableBalls: () => void
  setSelectedBall: (selectedBall: number) => void
  resetSelectedBall: () => void
  switchBallsWithPrior: () => void
  getBalls: (cardsState: CardsStateType) => tBall.BallsType
}

export function useBalls(): BallsStateType {
  const ballsState: BallsStateType = reactive({
    balls: [],
    priorBalls: [],
    selectedBall: -1,
    playableBalls: [],
    updateBallsState: (balls: tBall.BallsType, priorBalls: tBall.BallsType) => {
      ballsState.balls = balls
      ballsState.priorBalls = priorBalls
    },
    setPlayableBalls: (playableBalls) => {
      ballsState.playableBalls = playableBalls
    },
    resetPlayableBalls: () => {
      ballsState.playableBalls = []
    },
    setSelectedBall: (selectedBall) => {
      if (ballsState.selectedBall === selectedBall) {
        ballsState.selectedBall = -1
      } else {
        ballsState.selectedBall = selectedBall
      }
    },
    resetSelectedBall: () => {
      ballsState.selectedBall = -1
    },
    switchBallsWithPrior: () => {
      const aux = cloneDeep(ballsState.balls)
      ballsState.balls = cloneDeep(ballsState.priorBalls)
      ballsState.priorBalls = aux
    },
    getBalls: (cardsState) => {
      if (
        cardsState.selectedCard !== -1 &&
        cardsState.cards[cardsState.selectedCard].title === 'tac' &&
        cardsState.cards[cardsState.selectedCard].textAction !== 'abwerfen' &&
        cardsState.cards[cardsState.selectedCard].possible === true
      ) {
        return ballsState.priorBalls
      }
      return ballsState.balls
    },
  })

  return ballsState
}
