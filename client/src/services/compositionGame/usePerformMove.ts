import { getRemainingMoves } from '@/js/sevenGetSteps'

import { ballsStateType } from './useBalls';
import { miscStateType } from './useMisc';
import { discardPileStateType } from './useDiscardPile';
import { cardsStateType } from './useCards';
import { moveTextOrBall } from '@/../../shared/types/typesBall';

export type performMoveAction = {
    textAction: string,
    ballAction: number[],
    move: moveTextOrBall
}
export type performMoveType = (action: performMoveAction) => moveTextOrBall;

export function usePerformMove(cardsState: cardsStateType, ballsState: ballsStateType, miscState: miscStateType, discardPileState: discardPileStateType): performMoveType {
    const performMove: performMoveType = (action) => {
        if (cardsState.selectedCard !== -1 && cardsState.cards[cardsState.selectedCard].title === 'tac' && action.textAction !== 'abwerfen') {
            ballsState.switchBallsWithPrior()
        }

        if (action.textAction === 'beenden') {
            console.log('Beende Spiel ohne gewählte Karte')
        } else if (action.textAction === 'tauschen') {
            console.log('Just Remove Card')
            cardsState.cards.splice(cardsState.selectedCard, 1)
            cardsState.cardAnimation = true;
            cardsState.resetSelectedCard();
            cardsState.disableCards();
        } else if (action.textAction === 'Karten weitergeben') {
            console.log('Karten weitergeben')
            cardsState.removeAllCards()
        } else if ((action.textAction === 'narr' && miscState.players[miscState.gamePlayer]?.narrFlag[0] === false) || action.textAction !== '' || getRemainingMoves({ title: cardsState.cards[cardsState.selectedCard].title, possible: false, ballActions: [], textAction: '', key: '', style: '' }, ballsState.balls, action.ballAction[0], action.ballAction[1], discardPileState.discardPile) === 0) {
            console.log('Animation')
            const nDash = cardsState.cards[cardsState.selectedCard].title.indexOf('-')
            if (nDash !== -1) {
                cardsState.cards[cardsState.selectedCard].title = cardsState.cards[cardsState.selectedCard].title.substring(0, nDash)
            }

            discardPileState.addToDiscardPile(cardsState.cards[cardsState.selectedCard])

            cardsState.cardAnimation = true;
            cardsState.cards.splice(cardsState.selectedCard, 1)
            cardsState.resetSelectedCard();
            cardsState.disableCards();

            setTimeout(() => { discardPileState.performAnimation() }, 50)
        } else {
            const remainingMoves = getRemainingMoves({ title: cardsState.cards[cardsState.selectedCard].title, possible: false, ballActions: [], textAction: '', key: '', style: '' }, ballsState.balls, action.ballAction[0], action.ballAction[1], discardPileState.discardPile)
            const nDash = cardsState.cards[cardsState.selectedCard].title.indexOf('-')
            cardsState.cards[cardsState.selectedCard].title = (nDash === -1 ? cardsState.cards[cardsState.selectedCard].title : cardsState.cards[cardsState.selectedCard].title.substring(0, nDash)) + `-${remainingMoves}`
            //ballsState.resetPlayableBalls()
            if ((miscState.players.length === 4 && action.ballAction[1] < 80) || (miscState.players.length === 6 && action.ballAction[1] < 90)) {
                ballsState.resetSelectedBall()
            }
        }

        return action.move
    }

    return performMove
}
