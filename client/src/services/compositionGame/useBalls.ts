import { reactive } from 'vue';
import { cloneDeep } from 'lodash';

import * as tBall from '@/../../shared/types/typesBall';
import { cardsStateType } from './useCards';

export interface ballsStateType {
    balls: tBall.ballsType,
    priorBalls: tBall.ballsType,
    selectedBall: number,
    playableBalls: tBall.ballActions,
    updateBallsState: (balls: tBall.ballsType, priorBalls: tBall.ballsType) => void,
    setPlayableBalls: (playableBalls: tBall.ballActions) => void,
    resetPlayableBalls: () => void,
    setSelectedBall: (selectedBall: number) => void,
    resetSelectedBall: () => void,
    switchBallsWithPrior: () => void,
    getBalls: (cardsState: cardsStateType) => tBall.ballsType,
}

export function useBalls(): ballsStateType {
    const ballsState: ballsStateType = reactive({
        balls: [],
        priorBalls: [],
        selectedBall: -1,
        playableBalls: [],
        updateBallsState: (balls: tBall.ballsType, priorBalls: tBall.ballsType) => {
            ballsState.balls = balls;
            ballsState.priorBalls = priorBalls
        },
        setPlayableBalls: (playableBalls) => { ballsState.playableBalls = playableBalls },
        resetPlayableBalls: () => { ballsState.playableBalls = [] },
        setSelectedBall: (selectedBall) => {
            if (ballsState.selectedBall === selectedBall) { ballsState.selectedBall = -1 }
            else { ballsState.selectedBall = selectedBall }
        },
        resetSelectedBall: () => { ballsState.selectedBall = -1 },
        switchBallsWithPrior: () => {
            const aux = cloneDeep(ballsState.balls)
            ballsState.balls = cloneDeep(ballsState.priorBalls)
            ballsState.priorBalls = aux
        },
        getBalls: (cardsState) => {
            if (cardsState.selectedCard !== -1 &&
                cardsState.cards[cardsState.selectedCard].title === 'tac' &&
                cardsState.cards[cardsState.selectedCard].textAction !== 'abwerfen' &&
                cardsState.cards[cardsState.selectedCard].possible === true) {
                return ballsState.priorBalls
            }
            return ballsState.balls
        }
    })

    return ballsState
}
