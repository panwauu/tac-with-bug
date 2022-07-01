import * as dbGame from '../../../shared/types/typesDBgame';
import * as tCard from '../../../shared/types/typesCard';
import { player } from '../../../shared/types/typesPlayers';
import { game } from './game';
import type { updateDataType } from '../../../shared/types/typesDBgame';

export function getPlayerUpdateFromGame(
    game: dbGame.gameForPlay,
    gamePlayer: number
): updateDataType {
    return {
        gamePlayer: gamePlayer,
        tournamentID: game.publicTournamentId,
        discardPile: game.game.cards.discardPile,
        balls: game.game.balls,
        priorBalls: game.game.priorBalls,
        cards: getCards(game.game, gamePlayer),
        ownCards: game.game.cards.players?.[gamePlayer] ?? [],
        players: getPlayers(game.game, game.players),
        gameEnded: game.game.gameEnded,
        winningTeams: game.game.winningTeams,
        aussetzenFlag: game.game.aussetzenFlag,
        teufelFlag: game.game.teufelFlag,
        status: game.status,
        coopCounter: game.game.coop
            ? game.game.statistic.reduce(function (accumulator, currentValue) {
                return accumulator + currentValue.cards.total[0];
            }, 0)
            : -1,
        statistic: game.game.statistic,
        tradeDirection: game.game.tradeDirection,
        deckInfo: [game.game.cards.dealingPlayer, game.game.cards.deck.length],
        colors: game.colors,
        created: game.created,
        lastPlayed: game.lastPlayed,
        rematch_open: game.rematch_open,
        discardedFlag: game.game.cards.discardedFlag,
    };
}

function getPlayers(game: game, names: string[]) {
    const players: player[] = [];
    for (let i = 0; i < game.cards.players.length; i++) {
        const player: player = {
            name: names ? names[i] : 'Player ' + i.toString(),
            remainingCards: game.cards.players[i].length,
            active: game.activePlayer === i,
            playerNumber: i,
            team: game.teams.findIndex((team) => team.includes(i)),
            narrFlag: [game.narrFlag.some((e) => e === true), game.narrFlag[i]],
            discarded: game.cards.discardPlayer === i,
        };
        if (game.tradeFlag) {
            player.tradeInformation = [
                game.tradeFlag === true &&
                (game.cards.players[i].includes('1') ||
                    game.cards.players[i].includes('13') ||
                    game.tradeCards[i] === '1' ||
                    game.tradeCards[i] === '13'),
                game.tradeCards[i] !== '',
            ];
        }
        players.push(player);
    }
    return players;
}

function createCardsWithMovesForUnactivePlayer(playerCards: string[], textAction?: 'tauschen' | 'narr'): tCard.playerCard[] {
    return playerCards.map((card) => {
        return {
            title: card,
            possible: textAction != undefined,
            ballActions: {},
            textAction: textAction ?? '',
        }
    })
}

function getCards(game: game, player: number): tCard.playerCard[] {
    if (player < 0 || player >= game.nPlayers) { return [] }

    if (game.tradeFlag === true && game.tradeCards[player] === '') {
        return createCardsWithMovesForUnactivePlayer(game.cards.players[player], 'tauschen')
    }

    if (!game.tradeFlag && !game.narrFlag.some((e) => e === true) && player === game.activePlayer) {
        return game.cardsWithMoves;
    }

    return createCardsWithMovesForUnactivePlayer(game.cards.players[player])
}

export function getStatus(game: dbGame.gameForPlay) {
    let status = 'running'
    if (game.game.gameEnded) {
        status = 'won';
        if (!game.game.coop) { status += '-' + game.game.winningTeams.findIndex((teamWinner) => teamWinner === true).toString() }
    }
    return status
}
