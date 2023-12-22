import logger from '../helpers/logger'
import type pg from 'pg'
import type * as tDBTypes from '../sharedTypes/typesDBgame'

import { Game } from '../game/game'
import { captureMove } from './capture'
import { updateTournamentFromGame as updatePrivateTournamentFromGame } from './tournamentsPrivate'
import { updateTournamentFromGame as updatePublicTournamentFromGame } from './tournamentsPublic'
import type { MoveType } from '../sharedTypes/typesBall'
import { expectOneChangeInDatabase } from '../dbUtils/dbHelpers'
import { sendUpdatesOfGameToPlayers } from '../socket/game'
import { emitGamesUpdate, emitRunningGamesUpdate } from '../socket/games'
import { getSocketByUserID } from '../socket/general'
import { getSubstitution } from './substitution'

function mergeElementsWithIndices<T>(elements: T[], indices: number[], minLength: number): (T | null)[] {
  return Array(Math.max(Math.max(...indices) + 1, minLength))
    .fill(null)
    .map((_, index) => {
      return elements[indices.findIndex((i) => i === index)] ?? null
    })
}

async function queryGamesByID(sqlClient: pg.Pool, gameIDs: number[]) {
  const query = `
  SELECT 
    games.*, 
    array_agg(users.username ORDER BY users_to_games.player_index) as players, 
    array_agg(users.id ORDER BY users_to_games.player_index) as playerids, 
    array_agg(users_to_games.player_index ORDER BY users_to_games.player_index) as player_indices
  FROM games 
    JOIN users_to_games ON games.id = users_to_games.gameid 
    JOIN users ON users_to_games.userid = users.id 
  WHERE games.id = ANY($1::int[]) GROUP BY games.id ORDER BY games.id;`
  const dbRes = await sqlClient.query(query, [gameIDs])

  const games: tDBTypes.GameForPlay[] = []

  dbRes.rows.forEach((dbGame) => {
    games.push({
      id: dbGame.id,
      running: dbGame.running,
      nPlayers: dbGame.n_players,
      nTeams: dbGame.n_teams,
      coop: dbGame.game.coop,
      created: Date.parse(dbGame.created),
      lastPlayed: Date.parse(dbGame.lastplayed),
      publicTournamentId: dbGame.public_tournament_id,
      privateTournamentId: dbGame.private_tournament_id,
      players: mergeElementsWithIndices(dbGame.players, dbGame.player_indices, dbGame.game.nPlayers),
      playerIDs: mergeElementsWithIndices(dbGame.playerids, dbGame.player_indices, dbGame.game.nPlayers),
      game: new Game(0, 0, false, false, dbGame.game),
      colors: dbGame.colors,
      rematch_open: dbGame.rematch_open,
      substitution: getSubstitution(dbGame.id),
    })
  })

  return games
}

export async function getGame(sqlClient: pg.Pool, gameID: number) {
  const gameArray = await queryGamesByID(sqlClient, [gameID])
  if (gameArray.length !== 1) {
    throw new Error('GameID does not exist')
  }
  return gameArray[0]
}

export async function getGames(sqlClient: pg.Pool, userID: number) {
  const dbRes = await sqlClient.query('SELECT gameid FROM users_to_games WHERE userid=$1;', [userID])
  if (dbRes.rows.length === 0) {
    return []
  }
  return queryGamesByID(
    sqlClient,
    dbRes.rows.map((row) => {
      return row.gameid
    })
  )
}

export async function getRunningGames(pgPool: pg.Pool): Promise<tDBTypes.GetRunningGamesType[]> {
  const dbRes = await pgPool.query('SELECT id FROM games WHERE running=TRUE;')
  if (dbRes.rows.length === 0) {
    return []
  }
  const games = await queryGamesByID(
    pgPool,
    dbRes.rows.map((row) => {
      return row.id
    })
  )
  return games.map((g) => {
    return {
      id: g.id,
      teams: getTeamsFromGame(g),
      created: g.created,
      lastPlayed: g.lastPlayed,
    }
  })
}

export async function createGame(
  sqlClient: pg.Pool,
  teamsParam: number,
  playerIDs: number[],
  meisterVersion: boolean,
  coop: boolean,
  colors: string[],
  publicTournamentId: number | undefined,
  privateTournamentId: number | undefined
) {
  let teams = teamsParam
  if (playerIDs.length === 6 && teams === 1 && coop === true) {
    teams = 3
  } else if (playerIDs.length === 4) {
    teams = 2
  }

  const newGame = new Game(playerIDs.length, teams, meisterVersion, coop)

  const values = [playerIDs.length, teams, newGame.getJSON(), publicTournamentId, JSON.stringify(colors.slice(0, playerIDs.length)), privateTournamentId]
  const query = 'INSERT INTO games (n_players, n_teams, game, public_tournament_id, colors, private_tournament_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;'
  const createGameRes = await sqlClient.query(query, values).then((res) => {
    captureMove(sqlClient, res.rows[0].id, ['init', playerIDs.length, teams, meisterVersion, coop], newGame)
    return res
  })
  if (createGameRes.rowCount !== 1) {
    throw new Error('Could not create Game')
  }

  const userToGameQuery = `
        INSERT INTO users_to_games (userid, gameid, player_index) VALUES 
        ($2, $1, 0), ($3, $1, 1), ($4, $1, 2), ($5, $1, 3) 
        ${playerIDs.length === 6 ? ', ($6, $1, 4), ($7, $1, 5)' : ''};`
  await sqlClient.query(userToGameQuery, [createGameRes.rows[0].id, ...playerIDs])

  return getGame(sqlClient, createGameRes.rows[0].id)
}

export async function updateGame(sqlClient: pg.Pool, gameID: number, gameJSON: string, running: boolean, setTimeFlag: boolean, openRematchFlag: boolean) {
  const query = `UPDATE games SET game = $1, ${setTimeFlag ? 'lastPlayed = current_timestamp,' : ''} running = $3, rematch_open = $4 WHERE id = $2;`
  const values = [gameJSON, gameID, running, openRematchFlag]
  return sqlClient.query(query, values)
}

export async function abortGame(pgPool: pg.Pool, gameID: number) {
  const game = await getGame(pgPool, gameID)
  if (game.privateTournamentId != null) {
    await updatePrivateTournamentFromGame(pgPool, game, true)
  }
  if (game.publicTournamentId != null) {
    await updatePublicTournamentFromGame(pgPool, game, true)
  }
  await pgPool.query('UPDATE games SET running=FALSE WHERE id=$1;', [gameID])

  game.playerIDs.forEach((id) => {
    const socket = getSocketByUserID(id ?? -1)
    socket != null && emitGamesUpdate(pgPool, socket)
  })
  emitRunningGamesUpdate(pgPool)
  sendUpdatesOfGameToPlayers(game)
}

export async function getGamesSummary(sqlClient: pg.Pool, userID: number): Promise<tDBTypes.GetGamesType> {
  const games = await getGames(sqlClient, userID)

  return {
    open: games.filter((g) => g.running && g.playerIDs.findIndex((id) => id === userID) < g.nPlayers).length,
    aborted: games.filter((g) => (!g.running && !g.game.gameEnded) || g.playerIDs.findIndex((id) => id === userID) >= g.nPlayers).length,
    won: games.filter(
      (g) => !g.running && !g.game.coop && g.game.gameEnded && g.game.winningTeams[g.game.teams.findIndex((t) => t.includes(g.playerIDs.findIndex((e) => e === userID)))]
    ).length,
    lost: games.filter(
      (g) => !g.running && !g.game.coop && g.game.gameEnded && !g.game.winningTeams[g.game.teams.findIndex((t) => t.includes(g.playerIDs.findIndex((e) => e === userID)))]
    ).length,
    team: games.filter((g) => !g.running && g.game.coop && g.game.gameEnded).length,
    history: games
      .filter((g) => !g.running && g.game.gameEnded)
      .slice(-10)
      .map((g) => {
        if (g.game.coop) {
          return 2
        }
        if (g.game.winningTeams[g.game.teams.findIndex((t) => t.includes(g.playerIDs.findIndex((e) => e === userID)))]) {
          return 1
        } else {
          return 0
        }
      }),
    runningGames: games
      .filter((g) => g.running && g.playerIDs.findIndex((id) => id === userID) < g.nPlayers)
      .map((game) => {
        const teams = getTeamsFromGame(game)

        return {
          id: game.id,
          running: game.running,
          coop: game.game.coop,
          nTeams: game.nTeams,
          nPlayers: game.nPlayers,
          status: 'running',
          created: game.created,
          lastPlayed: game.lastPlayed,
          players: game.players,
          playerIDs: game.playerIDs,
          publicTournamentId: game.publicTournamentId,
          privateTournamentId: game.privateTournamentId,
          nPlayer: game.playerIDs.indexOf(userID),
          teams: teams,
        }
      }),
  }
}

function getTeamsFromGame(game: tDBTypes.GameForPlay) {
  const order = game.nPlayers === 4 ? [0, 2, 1, 3] : game.nTeams === 2 ? [0, 2, 4, 1, 3, 5] : [0, 3, 1, 4, 2, 5]
  const orderedPlayers = order.map((i) => game.players[i])

  const teams: string[][] = []
  for (let team = 0; team < game.nTeams; team++) {
    const arr: string[] = []
    for (let iterator = 0; iterator < orderedPlayers.length / game.nTeams; iterator++) {
      const player = orderedPlayers[(team * orderedPlayers.length) / game.nTeams + iterator]
      if (player != null) {
        arr.push(player)
      }
    }
    teams.push(arr)
  }

  return teams
}

export async function getGamesLazy(sqlClient: pg.Pool, userID: number, first: number, limit: number, sortField: string | undefined, sortOrder: number | undefined) {
  const orderColumn = sortField === 'created' ? 'created' : 'id'
  const values = [userID, limit, first]

  const res = await sqlClient.query(
    `SELECT games.created, games.id, count(*) OVER() AS n_entries FROM users_to_games 
    JOIN games ON users_to_games.gameid = games.id AND users_to_games.userid = $1 
    ORDER BY games.${orderColumn} ${sortOrder === 1 ? 'ASC' : 'DESC'} LIMIT $2 OFFSET $3;`,
    values
  )
  const nEntries = parseInt(res.rows[0]?.n_entries) || 0
  const idList = res.rows.map((r) => r.id as number)
  const gamesFromDB = await queryGamesByID(sqlClient, idList)

  const games: tDBTypes.GameForOverview[] = gamesFromDB.map((game) => {
    const teams = getTeamsFromGame(game)

    const nPlayer = game.playerIDs.indexOf(userID)

    return {
      id: game.id,
      running: game.running,
      coop: game.game.coop,
      nTeams: game.nTeams,
      nPlayers: game.nPlayers,
      status: getStatusForOverview(game, nPlayer),
      created: game.created,
      lastPlayed: game.lastPlayed,
      players: game.players,
      playerIDs: game.playerIDs,
      publicTournamentId: game.publicTournamentId,
      privateTournamentId: game.privateTournamentId,
      nPlayer: nPlayer,
      teams: teams,
    }
  })

  return { games: games.sort(gamesSort(orderColumn, sortOrder ?? 1)), nEntries }
}

function getStatusForOverview(game: tDBTypes.GameForPlay, playerIndex: number) {
  if (playerIndex >= game.nPlayers) {
    return 'aborted'
  }

  if (game.running) {
    return 'running'
  }

  if (!game.game.gameEnded) {
    return 'aborted'
  }

  if (game.game.coop || game.game.winningTeams[game.game.teams.findIndex((t) => t.includes(playerIndex))] === true) {
    return 'won'
  }

  return 'lost'
}

function gamesSort(sortField: string, sortOrder: number) {
  return function (a: any, b: any) {
    if (a[sortField] < b[sortField]) {
      return -1 * sortOrder
    } else {
      return sortOrder
    }
  }
}

export async function performMoveAndReturnGame(sqlClient: pg.Pool, postMove: MoveType, gamePlayer: number, gameID: number) {
  const game = await getGame(sqlClient, gameID)
  if (!game.game.checkMove(postMove) || (postMove !== 'dealCards' && postMove[0] !== gamePlayer)) {
    throw new Error('Player not allowed to play')
  }
  if (!game.running) {
    throw new Error('Game has already been ended')
  }
  game.game.performAction(postMove, Math.floor((Date.now() - game.lastPlayed) / 1000))

  if (game.game.gameEnded) {
    game.running = false
    game.rematch_open = true
  }

  await updateGame(
    sqlClient,
    gameID,
    game.game.getJSON(),
    game.running,
    !(game.game.tradeFlag && game.game.statistic.filter((s) => s.cards.total[2] > 0).length > 1),
    game.rematch_open
  )
  await captureMove(sqlClient, gameID, postMove, game.game)

  if (game.game.gameEnded) {
    game.playerIDs.forEach((id) => {
      const socket = getSocketByUserID(id ?? -1)
      socket != null && emitGamesUpdate(sqlClient, socket)
    })
    emitRunningGamesUpdate(sqlClient)
  }

  if (game.privateTournamentId != null) {
    updatePrivateTournamentFromGame(sqlClient, game)
  }
  if (game.publicTournamentId != null) {
    updatePublicTournamentFromGame(sqlClient, game)
  }

  game.lastPlayed = Date.now()

  return game
}

export async function endNotProperlyEndedGames(sqlClient: pg.Pool) {
  const dbRes = await sqlClient.query("SELECT id FROM games WHERE running=TRUE AND lastplayed < NOW() - INTERVAL '5 minutes';")

  dbRes.rows
    .map((e) => e.id)
    .forEach(async (id) => {
      const game = await getGame(sqlClient, id)
      if (game.game.winningTeams.some((e) => e === true)) {
        game.game.gameEnded = true
        logger.info(`Spiel beendet durch Automat: ID=${id}`)
        await updateGame(sqlClient, id, game.game.getJSON(), false, false, false)
        if (game.privateTournamentId != null) {
          updatePrivateTournamentFromGame(sqlClient, game)
        }
        if (game.publicTournamentId != null) {
          updatePublicTournamentFromGame(sqlClient, game)
        }
        game.playerIDs.forEach((id) => {
          const socket = getSocketByUserID(id ?? -1)
          socket != null && emitGamesUpdate(sqlClient, socket)
        })
        emitRunningGamesUpdate(sqlClient)
        sendUpdatesOfGameToPlayers(game)
      }
    })
}

export async function abortNotEndedGames(sqlClient: pg.Pool) {
  const dbRes = await sqlClient.query("SELECT id FROM games WHERE running=TRUE AND lastplayed < NOW() - INTERVAL '2 hours';")
  dbRes.rows.forEach(async (row) => {
    await abortGame(sqlClient, row.id)
  })
}

export async function disableRematchOfGame(pgPool: pg.Pool, id: number) {
  const dbRes = await pgPool.query('UPDATE games SET rematch_open = FALSE WHERE id = $1;', [id])
  expectOneChangeInDatabase(dbRes)
}

export async function disableRematchOfOldGames(pgPool: pg.Pool): Promise<number[]> {
  const dbRes = await pgPool.query<{ id: number }>(
    "UPDATE games SET rematch_open = FALSE WHERE rematch_open = TRUE AND current_timestamp - lastplayed > interval '3 minutes' RETURNING id;"
  )
  return dbRes.rows.map((r) => r.id)
}
