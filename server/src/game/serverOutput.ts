import type * as dbGame from '../sharedTypes/typesDBgame'
import type * as tCard from '../sharedTypes/typesCard'
import type { Player } from '../sharedTypes/typesPlayers'
import type { Game } from './game'
import type { UpdateDataType } from '../sharedTypes/typesDBgame'
import { getBotName } from '../bot/names'

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
    players: getPlayers(game.game, game.players, game.bots, game.id),
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

function getPlayers(game: Game, names: (string | null)[], bots: (number | null)[], gameID: number) {
  const players: Player[] = []
  for (let i = 0; i < game.cards.players.length; i++) {
    const player: Player = {
      name: names[i] ?? (bots[i] != null ? getBotName(gameID, i) : ''),
      remainingCards: game.cards.players[i].length,
      active: game.activePlayer === i,
      playerNumber: i,
      team: game.teams.findIndex((team) => team.includes(i)),
      narrFlag: [game.narrFlag.some((e) => e === true), game.narrFlag[i]],
      discarded: game.cards.discardPlayer === i,
      bot: bots[i] != null,
    }
    if (game.tradeFlag) {
      player.tradeInformation = [
        game.tradeFlag === true && (game.cards.players[i].includes('1') || game.cards.players[i].includes('13') || game.tradedCards[i] === '1' || game.tradedCards[i] === '13'),
        game.tradedCards[i] != null,
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

export function getCards(game: Game, player: number): tCard.PlayerCard[] {
  if (player < 0 || player >= game.nPlayers) {
    return []
  }

  if (game.tradeFlag === true && game.tradedCards[player] == null) {
    return createCardsWithMovesForUnactivePlayer(game.cards.players[player], 'tauschen')
  }

  if (!game.tradeFlag && !game.narrFlag.some((e) => e === true) && player === game.activePlayer) {
    return game.cardsWithMoves
  }

  return createCardsWithMovesForUnactivePlayer(game.cards.players[player])
}
