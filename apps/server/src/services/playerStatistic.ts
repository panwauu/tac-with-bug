import type pg from 'pg'
import type * as tStatistic from '../sharedTypes/typesPlayerStatistic'
import type { GameForPlay, GameStatistic, GameStatisticActionsType, GameStatisticCardsType } from '@repo/core/types'
import type { PlayerFrontendStatistic } from '../sharedTypes/typesPlayerStatistic'

import { initalizeStatistic } from '@repo/core/game/statistic'
import { getGames } from './game'
import { ballPlayer } from '@repo/core/game/ballUtils'
import { getUser } from './user'
import { isHofMember } from './hof'

function intializePlayerStatistic(): tStatistic.PlayerStatistic {
  return {
    ...initalizeStatistic(1)[0],
    ...{
      wl: {
        nGamesWon4: 0,
        nGamesWon6: 0,
        nGamesLost4: 0,
        nGamesLost6: 0,
        nGamesCoopWon: 0,
        nGamesCoopAborted: 0,
        nGamesAborted: 0,
        nGamesRunning: 0,
        ballsInOwnTeam: 0,
        ballsInEnemy: 0,
        gamesHistory: [],
        people: {},
        coopBest4: null,
        coopBest6: null,
        coopWorst4: null,
        coopWorst6: null,
      },
    },
  }
}

function addWLStatisticAborted(playerStatistic: tStatistic.PlayerStatistic, game: GameForPlay) {
  if (game.coop) {
    playerStatistic.wl.nGamesCoopAborted += 1
  } else {
    playerStatistic.wl.nGamesAborted += 1
  }
  addToGamesHistory(playerStatistic, 'a')
}

function addWLStatisticCoop(playerStatistic: tStatistic.PlayerStatistic, game: GameForPlay, nPlayer: number) {
  playerStatistic.wl.nGamesCoopWon += 1
  const nMovesToWin = game.game.statistic.reduce(function (accumulator, currentValue) {
    return accumulator + currentValue.cards.total[0]
  }, 0)
  if (game.game.nPlayers === 4) {
    playerStatistic.wl.coopBest4 = playerStatistic.wl.coopBest4 == null ? nMovesToWin : Math.min(playerStatistic.wl.coopBest4, nMovesToWin)
    playerStatistic.wl.coopWorst4 = playerStatistic.wl.coopWorst4 == null ? nMovesToWin : Math.max(playerStatistic.wl.coopWorst4, nMovesToWin)
  } else {
    playerStatistic.wl.coopBest6 = playerStatistic.wl.coopBest6 == null ? nMovesToWin : Math.min(playerStatistic.wl.coopBest6, nMovesToWin)
    playerStatistic.wl.coopWorst6 = playerStatistic.wl.coopWorst6 == null ? nMovesToWin : Math.max(playerStatistic.wl.coopWorst6, nMovesToWin)
  }

  for (const [playerIndex, player] of game.players.entries()) {
    if (playerIndex !== nPlayer && player != null) {
      if (!(player in playerStatistic.wl.people)) {
        playerStatistic.wl.people[player] = [0, 0, 0, 0, 0]
      }
      playerStatistic.wl.people[player][4] += 1
    }
  }

  addToGamesHistory(playerStatistic, 'c')
}

function addWLStatisticWonLost(playerStatistic: tStatistic.PlayerStatistic, game: GameForPlay, nPlayer: number) {
  // Won - Lost
  const ownTeamIndex = game.game.teams.findIndex((team) => team.includes(nPlayer))
  if (game.nPlayers === 4) {
    game.game.winningTeams[ownTeamIndex] ? (playerStatistic.wl.nGamesWon4 += 1) : (playerStatistic.wl.nGamesLost4 += 1)
  } else {
    game.game.winningTeams[ownTeamIndex] ? (playerStatistic.wl.nGamesWon6 += 1) : (playerStatistic.wl.nGamesLost6 += 1)
  }
  addToGamesHistory(playerStatistic, game.game.winningTeams[ownTeamIndex] ? 'w' : 'l')

  // ballsInOwnTeam - ballsInEnemy
  playerStatistic.wl.ballsInOwnTeam += game.game.balls
    .filter((_, ballIndex) => game.game.teams[ownTeamIndex].includes(ballPlayer(ballIndex)))
    .filter((ball) => ball.state === 'goal' || ball.state === 'locked').length
  playerStatistic.wl.ballsInEnemy += game.game.balls
    .filter((_, ballIndex) => !game.game.teams[ownTeamIndex].includes(ballPlayer(ballIndex)))
    .filter((ball) => ball.state === 'goal' || ball.state === 'locked').length

  addToPlayers(playerStatistic, game, nPlayer, ownTeamIndex)
}

function addToPlayers(playerStatistic: tStatistic.PlayerStatistic, game: GameForPlay, nPlayer: number, ownTeamIndex: number) {
  for (const [playerIndex, player] of game.players.entries()) {
    if (playerIndex !== nPlayer && player != null && game.bots[playerIndex] == null) {
      if (!(player in playerStatistic.wl.people)) {
        playerStatistic.wl.people[player] = [0, 0, 0, 0, 0]
      }

      playerStatistic.wl.people[player][4] += 1
      if (game.game.teams[ownTeamIndex].includes(playerIndex)) {
        playerStatistic.wl.people[player][0] += 1
        playerStatistic.wl.people[player][1] += game.game.winningTeams[ownTeamIndex] ? 1 : 0
      } else {
        playerStatistic.wl.people[player][2] += 1
        playerStatistic.wl.people[player][3] += game.game.winningTeams[ownTeamIndex] ? 1 : 0
      }
    }
  }
}

export function addWLStatistic(playerStatistic: tStatistic.PlayerStatistic, game: GameForPlay, nPlayer: number) {
  if ((!game.running && !game.game.gameEnded) || nPlayer >= game.nPlayers) {
    return addWLStatisticAborted(playerStatistic, game)
  }

  if (game.running) {
    playerStatistic.wl.nGamesRunning += 1
    return addToGamesHistory(playerStatistic, 'r')
  }

  if (game.game.coop) {
    return addWLStatisticCoop(playerStatistic, game, nPlayer)
  }

  return addWLStatisticWonLost(playerStatistic, game, nPlayer)
}

function addToGamesHistory(playerStatistic: tStatistic.PlayerStatistic, status: 'w' | 'l' | 'c' | 'a' | 'r') {
  playerStatistic.wl.gamesHistory.push(status)
}

function addActionStatistic(playerStatistic: tStatistic.PlayerStatistic, gameStatistic: GameStatistic) {
  for (const key of Object.keys(playerStatistic.actions) as Array<keyof GameStatisticActionsType>) {
    playerStatistic.actions[key] += gameStatistic.actions[key]
  }
}

function addCardsStatistic(playerStatistic: tStatistic.PlayerStatistic, gameStatistic: GameStatistic) {
  for (const key of Object.keys(playerStatistic.cards) as Array<keyof GameStatisticCardsType>) {
    playerStatistic.cards[key][0] += gameStatistic.cards[key][0]
    playerStatistic.cards[key][1] += gameStatistic.cards[key][1]
    playerStatistic.cards[key][2] += gameStatistic.cards[key][2]
  }
}

export async function getPlayerStats(sqlClient: pg.Pool, userID: number) {
  const games = await getGames(sqlClient, userID)
  games.sort((a, b) => (a.lastPlayed > b.lastPlayed ? 1 : -1))
  const sum = intializePlayerStatistic()
  for (const game of games) {
    const playerIndex = game.playerIDs.indexOf(userID)
    addActionStatistic(sum, game.game.statistic[playerIndex])
    addCardsStatistic(sum, game.game.statistic[playerIndex])
    addWLStatistic(sum, game, playerIndex)
  }
  return sum
}

export async function getDataForProfilePage(sqlClient: pg.Pool, username: string): Promise<PlayerFrontendStatistic> {
  const user = await getUser(sqlClient, { username: username })
  if (user.isErr()) {
    throw new Error(user.error)
  }

  const stat = await getPlayerStats(sqlClient, user.value.id)

  return {
    history: stat.wl.gamesHistory,
    table:
      stat.wl.nGamesCoopWon + stat.wl.nGamesCoopAborted + stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6 === 0
        ? [0, 0, 0, 0, 0, 0, 0]
        : [
            stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6 > 0
              ? Math.round(((stat.wl.nGamesWon4 + stat.wl.nGamesWon6) / (stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6)) * 100)
              : 0,
            Math.round((countTradedSpecialCards(stat.cards) / stat.cards['total'][2]) * 100),
            Math.round(
              (100 * (stat.actions.nBallsKickedEnemy + stat.actions.nBallsKickedOwnTeam + stat.actions.nBallsKickedSelf)) /
                (stat.actions.nBallsKickedEnemy + stat.actions.nBallsKickedOwnTeam + stat.actions.nBallsKickedSelf + stat.actions.nBallsLost)
            ),
            Math.round(100 * Math.min(1, 10 / (stat.actions.timePlayed / stat.actions.nMoves))),
            Math.round((stat.actions.nAussetzen / stat.cards['8'][1]) * 100),
            Math.round((stat.cards['total'][1] / stat.cards['total'][0]) * 100),
            Math.round(
              100 -
                (100 * stat.wl.nGamesAborted) /
                  (stat.wl.nGamesCoopWon + stat.wl.nGamesCoopAborted + stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6 + stat.wl.nGamesAborted)
            ),
          ],
    gamesDistribution: {
      teamWon: stat.wl.nGamesCoopWon,
      teamAborted: stat.wl.nGamesCoopAborted,
      won4: stat.wl.nGamesWon4,
      lost4: stat.wl.nGamesLost4,
      won6: stat.wl.nGamesWon6,
      lost6: stat.wl.nGamesLost6,
      aborted: stat.wl.nGamesAborted,
      running: stat.wl.nGamesRunning,
    },
    people: stat.wl.people,
    hof: await isHofMember(sqlClient, username),
    userDescription: user.value.userDescription,
    registered: user.value.registered,
    blockedByModerationUntil: user.value.blockedByModerationUntil,
    coopBest4: stat.wl.coopBest4,
    coopBest6: stat.wl.coopBest6,
    coopWorst4: stat.wl.coopWorst4,
    coopWorst6: stat.wl.coopWorst6,
    ballsInOwnTeam: stat.wl.ballsInOwnTeam,
    ballsInEnemy: stat.wl.ballsInEnemy,
    nBallsLost: stat.actions.nBallsLost,
    nBallsKickedEnemy: stat.actions.nBallsKickedEnemy,
    nBallsKickedOwnTeam: stat.actions.nBallsKickedOwnTeam,
    nBallsKickedSelf: stat.actions.nBallsKickedSelf,
    nMoves: stat.actions.nMoves,
    timePlayed: stat.actions.timePlayed,
    nAbgeworfen: stat.actions.nAbgeworfen,
    nAussetzen: stat.actions.nAussetzen,
    cards: stat.cards,
  }
}

function countTradedSpecialCards(stat: any) {
  let total = 0
  for (const key of Object.keys(stat)) {
    if (key !== 'total') {
      total += stat[key][2]
    }
  }
  return total
}
