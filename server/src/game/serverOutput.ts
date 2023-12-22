import type * as dbGame from '../sharedTypes/typesDBgame.js'
import type * as tCard from '../sharedTypes/typesCard.js'
import type { Player } from '../sharedTypes/typesPlayers.js'
import type { Game } from './game.js'
import type { UpdateDataType } from '../sharedTypes/typesDBgame.js'

export function getPlayerUpdateFromGame(game: dbGame.GameForPlay, gamePlayer: number): UpdateDataType {
  return {
    gamePlayer: gamePlayer,
    publicTournamentId: game.publicTournamentId,
    privateTournamentId: game.privateTournamentId,
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
    running: game.running,
    coopCounter: game.game.coop
      ? game.game.statistic.reduce(function (accumulator, currentValue) {
          return accumulator + currentValue.cards.total[0]
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
    substitutedPlayerIndices: game.game.substitutedPlayerIndices,
    substitution: game.substitution,
    playernames: game.players,
    teams: game.game.teams,
  }
}

function getPlayers(game: Game, names: (string | null)[]) {
  const players: Player[] = []
  for (let i = 0; i < game.cards.players.length; i++) {
    const player: Player = {
      name: names[i] ?? '',
      remainingCards: game.cards.players[i].length,
      active: game.activePlayer === i,
      playerNumber: i,
      team: game.teams.findIndex((team) => team.includes(i)),
      narrFlag: [game.narrFlag.some((e) => e === true), game.narrFlag[i]],
      discarded: game.cards.discardPlayer === i,
    }
    if (game.tradeFlag) {
      player.tradeInformation = [
        game.tradeFlag === true && (game.cards.players[i].includes('1') || game.cards.players[i].includes('13') || game.tradeCards[i] === '1' || game.tradeCards[i] === '13'),
        game.tradeCards[i] !== '',
      ]
    }
    players.push(player)
  }
  return players
}

function createCardsWithMovesForUnactivePlayer(playerCards: string[], textAction?: 'tauschen' | 'narr'): tCard.PlayerCard[] {
  return playerCards.map((card) => {
    return {
      title: card,
      possible: textAction != null,
      ballActions: {},
      textAction: textAction ?? '',
    }
  })
}

function getCards(game: Game, player: number): tCard.PlayerCard[] {
  if (player < 0 || player >= game.nPlayers) {
    return []
  }

  if (game.tradeFlag === true && game.tradeCards[player] === '') {
    return createCardsWithMovesForUnactivePlayer(game.cards.players[player], 'tauschen')
  }

  if (!game.tradeFlag && !game.narrFlag.some((e) => e === true) && player === game.activePlayer) {
    return game.cardsWithMoves
  }

  return createCardsWithMovesForUnactivePlayer(game.cards.players[player])
}
