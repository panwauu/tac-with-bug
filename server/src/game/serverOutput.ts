import * as dbGame from '../sharedTypes/typesDBgame'
import * as tCard from '../sharedTypes/typesCard'
import { Player } from '../sharedTypes/typesPlayers'
import { Game } from './game'
import type { UpdateDataType } from '../sharedTypes/typesDBgame'

export function getPlayerUpdateFromGame(game: dbGame.GameForPlay, gamePlayer: number): UpdateDataType {
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
    replacedPlayerIndices: game.game.replacedPlayerIndices,
    replacement: game.replacement,
  }
}

function getPlayers(game: Game, names: string[]) {
  const players: Player[] = []
  for (let i = 0; i < game.cards.players.length; i++) {
    const player: Player = {
      name: names ? names[i] : 'Player ' + i.toString(),
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

export function getStatus(game: dbGame.GameForPlay) {
  let status = 'running'
  if (game.game.gameEnded) {
    status = 'won'
    if (!game.game.coop) {
      status += '-' + game.game.winningTeams.findIndex((teamWinner) => teamWinner === true).toString()
    }
  }
  return status
}
