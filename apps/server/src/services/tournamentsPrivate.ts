import type pg from 'pg'
import type * as tTournament from '../sharedTypes/typesTournament'

import { ok, err, Result } from 'neverthrow'
import { getUser, GetUserErrors } from './user'
import { createGame } from './game'
import { colors } from '../sharedDefinitions/colors'
import type { GameForPlay } from '@repo/core/types'
import { evaluateGameWinnerAndReturnEndedFlag, EvaluateGameWinnerAndReturnEndedFlagError, updateScore, createTournamentDataKO, CreateTournamentDataKOError } from './tournamentKO'
import { pushChangedPrivateTournament } from '../socket/tournamentPrivate'
import { getSocketByUserID } from '../socket/general'
import { emitGamesUpdate, emitRunningGamesUpdate } from '../socket/games'
import { switchFromTeamsOrderToGameOrder } from '@repo/core/game/teamUtils'

interface GetPrivateTournamentCondition {
  id?: number
  ids?: number[]
  status?: string
}

export async function getPrivateTournament(sqlClient: pg.Pool, condition?: GetPrivateTournamentCondition): Promise<tTournament.PrivateTournament[]> {
  // Build Where Clause
  let whereClause = ''
  const values: any[] = []
  if (condition != null) {
    const clauses: string[] = []
    if (condition?.id != null) {
      clauses.push(`T.id = $${clauses.length + 1}`)
      values.push(condition.id)
    }
    if (condition?.ids != null) {
      clauses.push(`T.id = ANY($${clauses.length + 1}::integer[])`)
      values.push(condition.ids)
    }
    if (condition?.status != null) {
      clauses.push(`T.status = $${clauses.length + 1}`)
      values.push(condition.status)
    }

    whereClause += clauses.length > 0 ? ' WHERE ' + clauses.join(' AND ') : ''
  }

  const rows = await sqlClient
    .query(
      `
    SELECT 
        (SELECT coalesce(json_agg(tTeams), '[]') FROM (
            SELECT 
                MAX(users_to_private_tournaments.team_name) as name,
                array_agg(users.username) as players,
                array_agg(users_to_private_tournaments.userid) as playerIDs
            FROM users_to_private_tournaments JOIN users ON users.id = users_to_private_tournaments.userid
            WHERE users_to_private_tournaments.tournamentid = T.id
            GROUP BY users_to_private_tournaments.team_number ORDER BY team_number
        ) as tTeams ) as teams,
        (SELECT coalesce(json_agg(tRegister), '[]') FROM (
            SELECT 
                private_tournaments_register.team_name as name,
                array_agg(users.username) as players,
                array_agg(private_tournaments_register.userid) as playerIDs,
                array_agg(private_tournaments_register.activated) as activated
            FROM private_tournaments_register JOIN users ON users.id = private_tournaments_register.userid
            WHERE private_tournaments_register.tournamentid = T.id
            GROUP BY private_tournaments_register.team_name
        ) as tRegister ) as register_teams,
        T.id, T.n_teams, T.players_per_team, T.teams_per_match, T.tournament_type, T.title, T.status, T.admin_player, T.data, U.username as admin_player_name
    FROM private_tournaments T INNER JOIN users U ON T.admin_player = U.id ${whereClause}`,
      values
    )
    .then((res) => {
      return res.rows
    })

  return rows.map((row) => {
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      data: row.data,
      teams: row.teams,
      registerTeams: row.register_teams,
      nTeams: row.n_teams,
      playersPerTeam: row.players_per_team,
      tournamentType: row.tournament_type,
      teamsPerMatch: row.teams_per_match,
      adminPlayerID: row.admin_player,
      adminPlayer: row.admin_player_name,
    }
  })
}

export type GetTournamentByIDError = 'TOURNAMENT_ID_NOT_FOUND'
export async function getPrivateTournamentByID(sqlClient: pg.Pool, id: number): Promise<Result<tTournament.PrivateTournament, GetTournamentByIDError>> {
  const tournaments = await getPrivateTournament(sqlClient, { id: id })
  return tournaments.length !== 1 ? err('TOURNAMENT_ID_NOT_FOUND') : ok(tournaments[0])
}

export type CreateTournamentError = 'ONLY_KO_TOURNAMENT_IMPLEMENTED' | GetTournamentByIDError | CreateTournamentDataKOError
export async function createPrivateTournament(
  pgPool: pg.Pool,
  title: string,
  adminPlayerId: number,
  nTeams: number,
  playersPerTeam: 2 | 3,
  teamsPerMatch: 2 | 3,
  tournamentType: 'KO'
): Promise<Result<tTournament.PrivateTournament, CreateTournamentError>> {
  let data: tTournament.TournamentDataKO
  if (tournamentType === 'KO') {
    const dataRes = createTournamentDataKO(nTeams, teamsPerMatch)
    if (dataRes.isErr()) {
      return err(dataRes.error)
    }
    data = dataRes.value
  } else {
    return err('ONLY_KO_TOURNAMENT_IMPLEMENTED')
  }

  const dbRes = await pgPool.query(
    'INSERT INTO private_tournaments (title, admin_player, n_teams, tournament_type, data, teams_per_match, players_per_team) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;',
    [title, adminPlayerId, nTeams, tournamentType, data, teamsPerMatch, playersPerTeam]
  )
  const tournaments = await getPrivateTournament(pgPool, { id: dbRes.rows[0].id })
  if (tournaments.length !== 1) {
    return err('TOURNAMENT_ID_NOT_FOUND')
  }
  return ok(tournaments[0])
}

export type AddPlayerError = GetUserErrors | 'TEAM_IS_ALREADY_FULL' | 'TOURNAMENT_NOT_FOUND'
export async function addPlayer(
  pgPool: pg.Pool,
  tournament: tTournament.PrivateTournament,
  usernameToAdd: string,
  teamTitle: string,
  activated: boolean
): Promise<Result<tTournament.PrivateTournament, AddPlayerError>> {
  const userToAdd = await getUser(pgPool, { username: usernameToAdd })
  if (userToAdd.isErr()) {
    return err(userToAdd.error)
  }

  const tournamentTeamID = tournament.registerTeams.find((t) => t.name === teamTitle)
  if (tournamentTeamID != null && tournamentTeamID.playerids.length >= tournament.playersPerTeam) {
    return err('TEAM_IS_ALREADY_FULL')
  }

  const values = [tournament.id, teamTitle, userToAdd.value.id, activated]
  await pgPool.query('INSERT INTO private_tournaments_register (tournamentid, team_name, userid, activated) VALUES ($1, $2, $3, $4);', values)

  const tournamentsAfter = await getPrivateTournament(pgPool, { id: tournament.id })
  if (tournamentsAfter.length !== 1) {
    return err('TOURNAMENT_NOT_FOUND')
  }

  return ok(tournamentsAfter[0])
}

export type RemovePlayerError = GetUserErrors | 'TEAM_IS_ALREADY_FULL' | 'TOURNAMENT_NOT_FOUND'
export async function removePlayer(
  pgPool: pg.Pool,
  tournament: tTournament.PrivateTournament,
  userIdToRemove: number
): Promise<Result<tTournament.PrivateTournament, RemovePlayerError>> {
  const values = [tournament.id, userIdToRemove]
  await pgPool.query('DELETE FROM private_tournaments_register WHERE tournamentid=$1 AND userid=$2;', values)

  const tournamentsAfter = await getPrivateTournament(pgPool, { id: tournament.id })
  if (tournamentsAfter.length !== 1) {
    return err('TOURNAMENT_NOT_FOUND')
  }

  return ok(tournamentsAfter[0])
}

export type ActivatePlayerError = 'NOT_PART_OF_TOURNAMENT' | 'TOURNAMENT_NOT_FOUND' | 'COULD_NOT_ACTIVATE_USER'
export async function activatePlayer(
  pgPool: pg.Pool,
  tournament: tTournament.PrivateTournament,
  userID: number
): Promise<Result<tTournament.PrivateTournament, ActivatePlayerError>> {
  const registerTeam = tournament.registerTeams.find((t) => t.playerids.includes(userID))
  if (registerTeam == null) {
    return err('NOT_PART_OF_TOURNAMENT')
  }

  const res = await pgPool.query('UPDATE private_tournaments_register SET activated=TRUE WHERE tournamentid=$1 AND userid=$2;', [tournament.id, userID])
  if (res.rowCount !== 1) {
    return err('COULD_NOT_ACTIVATE_USER')
  }

  const tournamentsAfter = await getPrivateTournament(pgPool, { id: tournament.id })
  if (tournamentsAfter.length !== 1) {
    return err('TOURNAMENT_NOT_FOUND')
  }

  return ok(tournamentsAfter[0])
}

export type StartPrivateTournamentError = 'TOURNAMENT_NOT_FOUND' | 'CANNOT_START_TOURNAMENT' | 'ONLY_PLANNED_TOURNAMENTS_CAN_BE_STARTED'
export async function startPrivateTournament(
  pgPool: pg.Pool,
  tournament: tTournament.PrivateTournament
): Promise<Result<tTournament.PrivateTournament, StartPrivateTournamentError>> {
  if (tournament.status !== 'planned') {
    return err('ONLY_PLANNED_TOURNAMENTS_CAN_BE_STARTED')
  }

  if (tournament.registerTeams.filter((t) => t.activated.filter((a) => a === true).length === tournament.playersPerTeam).length < tournament.nTeams) {
    return err('CANNOT_START_TOURNAMENT')
  }

  tournament.teams = tournament.registerTeams
    .filter((t) => t.activated.filter((a) => a === true).length === tournament.playersPerTeam)
    .map((r) => {
      return { name: r.name, players: r.players, playerids: r.playerids }
    })
  tournament.registerTeams = tournament.registerTeams.filter((t) => t.activated.filter((a) => a === true).length !== tournament.playersPerTeam)

  const dataForUsersToTournaments: { userid: number; tournamentid: number; team_name: string; team_number: number }[] = []
  for (const [i, r] of tournament.teams.entries()) {
    for (const id of r.playerids) {
      dataForUsersToTournaments.push({ team_number: i, team_name: r.name, tournamentid: tournament.id, userid: id })
    }
  }

  await pgPool.query("UPDATE private_tournaments SET status='running' WHERE id=$1;", [tournament.id])
  await pgPool.query('INSERT INTO users_to_private_tournaments SELECT m.* FROM json_populate_recordset(null::users_to_tournaments_type, $1::json) AS m;', [
    JSON.stringify(dataForUsersToTournaments),
  ])
  await pgPool.query('DELETE FROM private_tournaments_register WHERE tournamentid=$1;', [tournament.id])

  const tournamentsAfter = await getPrivateTournament(pgPool, { id: tournament.id })
  if (tournamentsAfter.length !== 1) {
    return err('TOURNAMENT_NOT_FOUND')
  }

  return ok(tournamentsAfter[0])
}

export type StartTournamentGameError = 'TOURNAMENT_NOT_FOUND' | 'COULD_NOT_FIND_GAME'
export async function startTournamentGame(
  pgPool: pg.Pool,
  tournament: tTournament.PrivateTournament,
  tournamentRound: number,
  roundGame: number
): Promise<Result<tTournament.PrivateTournament, StartTournamentGameError>> {
  if (tournament.data.brackets?.[tournamentRound]?.[roundGame] == null) {
    return err('COULD_NOT_FIND_GAME')
  }

  let playerids: number[] = []
  for (const t of tournament.data.brackets[tournamentRound][roundGame].teams) {
    playerids = playerids.concat(tournament.teams[t].playerids)
  }

  const playeridsOrdered = switchFromTeamsOrderToGameOrder(playerids, tournament.playersPerTeam * tournament.teamsPerMatch, tournament.teamsPerMatch)

  const colorsForGame = [...colors]
  const createdGame = await createGame(
    pgPool,
    2,
    playeridsOrdered,
    playeridsOrdered.map(() => null),
    true,
    false,
    colorsForGame,
    undefined,
    tournament.id
  )
  tournament.data.brackets[tournamentRound][roundGame].gameID = createdGame.id

  await pgPool.query('UPDATE private_tournaments SET data=$1 WHERE id=$2;', [tournament.data, tournament.id])

  const tournamentsAfter = await getPrivateTournament(pgPool, { id: tournament.id })
  if (tournamentsAfter.length !== 1) {
    return err('TOURNAMENT_NOT_FOUND')
  }

  for (const id of createdGame.playerIDs) {
    const socket = getSocketByUserID(id ?? -1)
    socket != null && emitGamesUpdate(pgPool, socket)
  }

  emitRunningGamesUpdate(pgPool)

  return ok(tournamentsAfter[0])
}

export type AbortTournamentGameError = 'TOURNAMENT_NOT_FOUND'
export async function abortPrivateTournament(pgPool: pg.Pool, tournament: tTournament.PrivateTournament): Promise<Result<tTournament.PrivateTournament, AbortTournamentGameError>> {
  const gameIDsToRemoveTournament: number[] = []

  for (const round of tournament.data.brackets) {
    for (const game of round) {
      if (game.gameID !== -1 && game.winner === -1) {
        gameIDsToRemoveTournament.push(game.gameID)
        game.gameID = -1
      }
    }
  }

  await pgPool.query('UPDATE games SET private_tournament_id = NULL WHERE id=ANY($1::INT[]);', [gameIDsToRemoveTournament])

  await pgPool.query("UPDATE private_tournaments SET status='aborted', data=$1 WHERE id=$2;", [tournament.data, tournament.id])

  const tournamentsAfter = await getPrivateTournament(pgPool, { id: tournament.id })
  if (tournamentsAfter.length !== 1) {
    return err('TOURNAMENT_NOT_FOUND')
  }

  return ok(tournamentsAfter[0])
}

export type UpdateTournamentFromGameError = 'GAME_IS_NOT_PART_OF_PRIVATE_TOURNAMENT' | 'TOURNAMENT_NOT_FOUND' | 'TOURNAMENT_NOT_RUNNING' | EvaluateGameWinnerAndReturnEndedFlagError
export async function updateTournamentFromGame(pgPool: pg.Pool, game: GameForPlay, forceGameEnd?: boolean): Promise<Result<null, UpdateTournamentFromGameError>> {
  if (game.privateTournamentId == null) {
    return err('GAME_IS_NOT_PART_OF_PRIVATE_TOURNAMENT')
  }

  const tournaments = await getPrivateTournament(pgPool, { id: game.privateTournamentId })
  if (tournaments.length !== 1) {
    return err('TOURNAMENT_NOT_FOUND')
  }
  if (tournaments[0].status === 'aborted') {
    return err('TOURNAMENT_NOT_RUNNING')
  }
  const tournament = tournaments[0]

  let changed = forceGameEnd ?? false
  if (game.game.gameEnded || forceGameEnd) {
    const ended = evaluateGameWinnerAndReturnEndedFlag(game, tournament)
    if (ended.isErr()) {
      return err(ended.error)
    }
    if (ended.value) {
      tournament.status = 'ended'
    }
    changed = true
  } else {
    const scoreChanged = updateScore(tournament, game)
    if (scoreChanged.isErr()) {
      return err(scoreChanged.error)
    }
    if (scoreChanged.value) {
      changed = scoreChanged.value
    }
  }

  if (changed) {
    await pgPool.query('UPDATE private_tournaments SET status=$1, data=$2 WHERE id = $3;', [tournament.status, tournament.data, tournament.id])
    pushChangedPrivateTournament(tournament)
  }
  return ok(null)
}

export async function deletePlayerFromTournament(pgPool: pg.Pool, userID: number) {
  await pgPool.query('DELETE FROM users_to_private_tournaments WHERE userid = $1;', [userID])
  await pgPool.query('DELETE FROM private_tournaments_register WHERE userid = $1;', [userID])

  const res = await pgPool.query<{ id: number; status: string }>('SELECT * FROM private_tournaments WHERE admin_player = $1;', [userID])
  for (const row of res.rows) {
    const otherUsersRes = await pgPool.query('SELECT * FROM users_to_private_tournaments WHERE tournamentid=$1;', [row.id])
    if (otherUsersRes.rowCount === 0) {
      await pgPool.query('DELETE FROM private_tournaments WHERE id=$1;', [row.id])
    } else {
      await pgPool.query('UPDATE private_tournaments SET admin_player = $2 WHERE id=$1;', [row.id, otherUsersRes.rows[0].userid])
    }
  }
}
