import type * as tCard from './typesCard';
import type * as tBall from './typesBall';
import type * as tStatistic from './typesStatistic';

export interface GameData {
    nPlayers: number;
    coop: boolean;
    priorBalls: tBall.ballsType;
    aussetzenFlag: boolean;
    teufelFlag: boolean;
    tradeFlag: boolean;
    tradeCards: tCard.cardType[];
    tradeDirection: number;
    narrFlag: boolean[];
    balls: tBall.ballsType;
    cards: tCard.cardsType;
    teams: number[][];
    cardsWithMoves: tCard.playerCard[];
    activePlayer: number;
    sevenChosenPlayer: number | null;
    gameEnded: boolean;
    winningTeams: boolean[];
    statistic: tStatistic.gameStatistic[];
}

export interface AbstractClassGame extends GameData {
    checkWinningTeams(): boolean[];
    resetGame(): void;
    getJSON(): string;
    updateCardsWithMoves(): void;
    checkMove(move: tBall.moveType): boolean
    performAction(move: tBall.moveType | 'dealCards', deltaTime: number): void
    performActionAfterStatistics(move: tBall.moveTextOrBall): void
    determineGameEnded(): void;
    determineGameEndedCoop(): void;
    performNarrAction(move: tBall.moveTextOrBall): void;
    performTradeCards(move: tBall.moveTextOrBall): void;
    performTextAction(card: tCard.playerCard, move: tBall.moveText): void;
    nextPlayer(): void
    priorPlayer(): void;
    checkCards(): void;
}
