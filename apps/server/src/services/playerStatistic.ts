import type pg from 'pg'
import type * as tStatistic from '../sharedTypes/typesStatistic'
import type { GameForPlay } from '@repo/core/types'
import type { PlayerFrontendStatistic } from '../sharedTypes/typesPlayerStatistic'

import { initalizeStatistic } from '@repo/core/game/statistic'
import { getGames } from './game'
import { ballPlayer } from '@repo/core/game/ballUtils'
import { getUser } from './user'
import { isHofMember } from './hof'

const lastGamesHistoryLength = 10

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
        lastGamesHistory: [],
        people: {},
        coopBest4: 1000,
        coopBest6: 1000,
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
  addToGamesHistory(playerStatistic, 'aborted')
}

function addWLStatisticCoop(playerStatistic: tStatistic.PlayerStatistic, game: GameForPlay, nPlayer: number) {
  playerStatistic.wl.nGamesCoopWon += 1
  const nMovesToWin = game.game.statistic.reduce(function (accumulator, currentValue) {
    return accumulator + currentValue.cards.total[0]
  }, 0)
  if (game.game.nPlayers === 4) {
    playerStatistic.wl.coopBest4 = Math.min(playerStatistic.wl.coopBest4, nMovesToWin)
  } else {
    playerStatistic.wl.coopBest6 = Math.min(playerStatistic.wl.coopBest6, nMovesToWin)
  }

  for (const [playerIndex, player] of game.players.entries()) {
    if (playerIndex !== nPlayer && player != null) {
      if (!(player in playerStatistic.wl.people)) {
        playerStatistic.wl.people[player] = [0, 0, 0, 0, 0]
      }
      playerStatistic.wl.people[player][4] += 1
    }
  }

  addToGamesHistory(playerStatistic, 'coop')
}

function addWLStatisticWonLost(playerStatistic: tStatistic.PlayerStatistic, game: GameForPlay, nPlayer: number) {
  // Won - Lost
  const ownTeamIndex = game.game.teams.findIndex((team) => team.includes(nPlayer))
  if (game.nPlayers === 4) {
    game.game.winningTeams[ownTeamIndex] ? (playerStatistic.wl.nGamesWon4 += 1) : (playerStatistic.wl.nGamesLost4 += 1)
  } else {
    game.game.winningTeams[ownTeamIndex] ? (playerStatistic.wl.nGamesWon6 += 1) : (playerStatistic.wl.nGamesLost6 += 1)
  }
  addToGamesHistory(playerStatistic, game.game.winningTeams[ownTeamIndex] ? 'won' : 'lost')

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
  // bestFriend worstEnemy --- [togetherTotal, togetherWon, againstTotal, againstWon]
  for (const [playerIndex, player] of game.players.entries()) {
    if (playerIndex !== nPlayer && player != null) {
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
    return addToGamesHistory(playerStatistic, 'running')
  }

  if (game.game.coop) {
    return addWLStatisticCoop(playerStatistic, game, nPlayer)
  }

  return addWLStatisticWonLost(playerStatistic, game, nPlayer)
}

function addToGamesHistory(playerStatistic: tStatistic.PlayerStatistic, status: 'won' | 'lost' | 'coop' | 'aborted' | 'running') {
  playerStatistic.wl.lastGamesHistory = playerStatistic.wl.lastGamesHistory
    .slice(Math.max(0, playerStatistic.wl.lastGamesHistory.length + 1 - lastGamesHistoryLength))
    .concat([status])
}

function addActionStatistic(playerStatistic: tStatistic.PlayerStatistic, gameStatistic: tStatistic.GameStatistic) {
  for (const key of Object.keys(playerStatistic.actions) as Array<keyof tStatistic.GameStatisticActionsType>) {
    playerStatistic.actions[key] += gameStatistic.actions[key]
  }
}

function addCardsStatistic(playerStatistic: tStatistic.PlayerStatistic, gameStatistic: tStatistic.GameStatistic) {
  for (const key of Object.keys(playerStatistic.cards) as Array<keyof tStatistic.GameStatisticCardsType>) {
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
    history: stat.wl.lastGamesHistory,
    players: findPlayersFromStat(stat.wl),
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

function findPlayersFromStat(wl: tStatistic.PlayerWLStatistic) {
  const res = {
    mostFrequent: '',
    bestPartner: '',
    worstEnemy: '',
  }

  if (Object.keys(wl.people).length === 0) {
    return res
  }

  const keys = Object.keys(wl.people)
  for (const key of keys) {
    if (res.mostFrequent === '' || wl.people[key][4] > wl.people[res.mostFrequent][4]) {
      res.mostFrequent = key
    }

    if (
      (res.bestPartner === '' && wl.people[key][0] > 0) ||
      (wl.people[key][0] > 0 && wl.people[key][1] / wl.people[key][0] > wl.people[res.bestPartner][1] / wl.people[res.bestPartner][0])
    ) {
      res.bestPartner = key
    }

    if (
      (res.worstEnemy === '' && wl.people[key][2] > 0) ||
      (wl.people[key][2] > 0 && wl.people[key][3] / wl.people[key][2] < wl.people[res.worstEnemy][3] / wl.people[res.worstEnemy][2])
    ) {
      res.worstEnemy = key
    }
  }

  return res
}

function getUserNetworkFromGamesNodes(games: GameForPlay[]): tStatistic.UserNetworkNode[] {
  const nodesLimit = 30
  const nodes: tStatistic.UserNetworkNode[] = []

  for (const game of games) {
    for (let playerInd = 0; playerInd < game.players.length; playerInd++) {
      const playerID = game.playerIDs[playerInd]
      if (playerID == null || game.players[playerInd] == null) {
        continue
      }

      const playerIndexInNodes = nodes.findIndex((n) => n.data.idInt === game.playerIDs[playerInd])
      if (playerIndexInNodes === -1) {
        nodes.push({
          data: {
            id: playerID.toString(),
            idInt: playerID,
            name: game.players[playerInd] ?? '',
            score: 1,
          },
        })
      } else {
        nodes[playerIndexInNodes].data.score += 1
      }
    }
  }

  return nodes.toSorted((n) => n.data.score).slice(0, nodesLimit)
}

function getUserNetworkFromGamesEdges(games: GameForPlay[], nodes: tStatistic.UserNetworkNode[], edges: tStatistic.UserNetworkEdge[], playerInd: number, gamesInd: number) {
  const playerID = games[gamesInd].playerIDs[playerInd]
  for (let playerEdgeInd = playerInd + 1; playerEdgeInd < games[gamesInd].players.length; playerEdgeInd++) {
    if (playerID == null) {
      continue
    }
    const playerIDedgeInd = games[gamesInd].playerIDs[playerEdgeInd]
    if (!nodes.some((n) => n.data.idInt === games[gamesInd].playerIDs[playerEdgeInd])) {
      continue
    }
    if (playerIDedgeInd == null || games[gamesInd].players[playerEdgeInd] == null) {
      continue
    }

    const together = games[gamesInd].game.teams.some((t) => t.includes(playerInd) && t.includes(playerEdgeInd))

    const edgeIndex = edges.findIndex((n) => {
      return (
        (n.data.source === playerID.toString() && n.data.target === playerIDedgeInd.toString() && n.data.together === together) ||
        (n.data.target === playerID.toString() && n.data.source === playerIDedgeInd.toString() && n.data.together === together)
      )
    })
    if (edgeIndex === -1) {
      edges.push({
        data: {
          source: playerID.toString(),
          target: playerIDedgeInd.toString(),
          weight: 1,
          together: together,
          id: `e${edges.length}`,
        },
      })
    } else {
      edges[edgeIndex].data.weight += 1
    }
  }
}

function getUserNetworkFromGames(allGames: GameForPlay[], userID: number, username: string): tStatistic.UserNetwork {
  const games = allGames.filter((g) => g.game.gameEnded && !g.running)

  const nodes = getUserNetworkFromGamesNodes(games)

  const edges: tStatistic.UserNetworkEdge[] = []
  for (let gamesInd = 0; gamesInd < games.length; gamesInd++) {
    for (let playerInd = 0; playerInd < games[gamesInd].players.length; playerInd++) {
      if (!nodes.some((n) => n.data.idInt === games[gamesInd].playerIDs[playerInd])) {
        continue
      }
      getUserNetworkFromGamesEdges(games, nodes, edges, playerInd, gamesInd)
    }
  }

  for (const n of nodes) {
    n.data.score = n.data.score / games.length
  }
  const edgeWeightMax = Math.max(...edges.map((e) => e.data.weight))
  for (const n of edges) {
    n.data.weight = n.data.weight / edgeWeightMax
  }

  if (nodes.length === 0) {
    nodes.push({
      data: {
        id: userID.toString(),
        idInt: userID,
        name: username,
        score: 1,
      },
    })
  }

  return { nodes, edges }
}

export async function getUserNetworkData(sqlClient: pg.Pool, username: string): Promise<tStatistic.UserNetworkApiResponse> {
  const user = await getUser(sqlClient, { username: username })
  if (user.isErr()) {
    throw new Error(user.error)
  }

  const games = await getGames(sqlClient, user.value.id)

  const stat = await getPlayerStats(sqlClient, user.value.id)
  const graph = getUserNetworkFromGames(games, user.value.id, username)
  return { graph: graph, people: stat.wl.people }
}
