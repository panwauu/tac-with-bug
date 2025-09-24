import { err, ok, Result } from 'neverthrow'
import type pg from 'pg'
import type * as tTournament from '../sharedTypes/typesTournament'

import { tournamentBus } from './tournaments'
import { getPublicTournamentByID, getPublicTournament, GetTournamentByIDError } from './tournamentsPublic'

function alreadyRegistered(tournament: tTournament.PublicTournament, userID: number) {
  return tournament.teams.some((t) => t.playerids.includes(userID)) || tournament.registerTeams.some((t) => t.playerids.includes(userID))
}

export type RegisterTeamError =
  | 'TOURNAMENT_STATUS_IS_NOT_SIGNUP'
  | 'TEAM_PLAYERS_NOT_DIFFERENT'
  | 'NOT_ALL_USERS_VALID'
  | 'USER_NOT_PART_OF_TEAM'
  | 'USER_ALREADY_IN_TOURNAMENT'
  | 'TEAMNAME_ALREADY_TAKEN'
  | GetTournamentByIDError
export async function registerTeam(
  sqlClient: pg.Pool,
  tournamentid: number,
  players: string[],
  teamTitle: string,
  userID: number
): Promise<Result<tTournament.PublicTournament, RegisterTeamError>> {
  const tournament = await getPublicTournamentByID(sqlClient, tournamentid)
  if (tournament.isErr()) {
    return err(tournament.error)
  }

  if (tournament.value.status !== 'signUp') {
    return err('TOURNAMENT_STATUS_IS_NOT_SIGNUP')
  }

  if (
    players.some((p) => {
      return (
        players.filter((p1) => {
          return p1 === p
        }).length !== 1
      )
    })
  ) {
    return err('TEAM_PLAYERS_NOT_DIFFERENT')
  }

  const userIDres = await sqlClient.query('SELECT username, id FROM users WHERE username = ANY($1::text[]);', [players])
  const playerids = players.map((username) => {
    return userIDres.rows.find((r) => r.username === username)?.id as number
  })

  if (playerids.some((id) => id === undefined)) {
    return err('NOT_ALL_USERS_VALID')
  }
  if (!playerids.includes(userID)) {
    return err('USER_NOT_PART_OF_TEAM')
  }

  for (const id of playerids) {
    if (alreadyRegistered(tournament.value, id)) {
      return err('USER_ALREADY_IN_TOURNAMENT')
    }
  }

  if (tournament.value.teams.some((t) => t.name === teamTitle) || tournament.value.registerTeams.some((t) => t.name === teamTitle)) {
    return err('TEAMNAME_ALREADY_TAKEN')
  }

  const team: tTournament.RegisterTeam = {
    name: teamTitle,
    playerids: playerids,
    players: players,
    activated: playerids.map((id) => id === userID),
  }

  tournament.value.registerTeams.push(team)

  const values: any[] = [tournamentid, team.name]
  for (const [i, id] of team.playerids.entries()) {
    values.push(id)
    values.push(team.activated[i])
  }
  await sqlClient.query(
    `INSERT INTO tournaments_register (tournamentid, team_name, userid, activated) VALUES ($1, $2, $3, $4) 
        ${team.players.length > 1 ? ',($1, $2, $5, $6)' : ''} ${team.players.length > 2 ? ',($1, $2, $7, $8)' : ''};`,
    values
  )
  return ok(tournament.value)
}

export type JoinTeamError = 'TOURNAMENT_STATUS_IS_NOT_SIGNUP' | 'USER_ALREADY_IN_TOURNAMENT' | 'TEAM_ALREADY_FULL' | 'WAITING_TEAM_NOT_FOUND' | GetTournamentByIDError
export async function joinTeam(
  sqlClient: pg.Pool,
  tournamentid: number,
  userID: number,
  username: string,
  teamName: string
): Promise<Result<tTournament.PublicTournament, JoinTeamError>> {
  const tournament = await getPublicTournamentByID(sqlClient, tournamentid)
  if (tournament.isErr()) {
    return err(tournament.error)
  }

  if (tournament.value.status !== 'signUp') {
    return err('TOURNAMENT_STATUS_IS_NOT_SIGNUP')
  }

  if (alreadyRegistered(tournament.value, userID)) {
    return err('USER_ALREADY_IN_TOURNAMENT')
  }

  const teamIndex = tournament.value.registerTeams.findIndex((t) => t.name === teamName)
  if (teamIndex === -1) {
    return err('WAITING_TEAM_NOT_FOUND')
  }
  if (tournament.value.registerTeams[teamIndex].players.length >= tournament.value.playersPerTeam) {
    return err('TEAM_ALREADY_FULL')
  }

  tournament.value.registerTeams[teamIndex].players.push(username)
  tournament.value.registerTeams[teamIndex].playerids.push(userID)
  tournament.value.registerTeams[teamIndex].activated.push(true)

  await sqlClient.query('INSERT INTO tournaments_register (userid, tournamentid, team_name, activated) VALUES ($1, $2, $3, $4);', [userID, tournament.value.id, teamName, true])
  const result = await endSignupIfComplete(sqlClient, tournament.value)

  return ok(result)
}

export type ActivateUserError = 'TOURNAMENT_STATUS_IS_NOT_SIGNUP' | 'USER_NOT_FOUND_IN_TOURNAMENT' | GetTournamentByIDError
export async function activateUser(sqlClient: pg.Pool, tournamentid: number, userID: number): Promise<Result<tTournament.PublicTournament, ActivateUserError>> {
  const tournament = await getPublicTournamentByID(sqlClient, tournamentid)
  if (tournament.isErr()) {
    return err(tournament.error)
  }

  if (tournament.value.status !== 'signUp') {
    return err('TOURNAMENT_STATUS_IS_NOT_SIGNUP')
  }

  const teamIndex = tournament.value.registerTeams.findIndex((r) => r.playerids.includes(userID))
  if (teamIndex === -1) {
    return err('USER_NOT_FOUND_IN_TOURNAMENT')
  }
  const playerIndex = tournament.value.registerTeams[teamIndex].playerids.indexOf(userID)
  if (playerIndex === -1) {
    return err('USER_NOT_FOUND_IN_TOURNAMENT')
  }

  tournament.value.registerTeams[teamIndex].activated[playerIndex] = true
  await sqlClient.query('UPDATE tournaments_register SET activated=true WHERE tournamentid=$1 AND userid=$2;', [tournament.value.id, userID])
  const result = await endSignupIfComplete(sqlClient, tournament.value)

  return ok(result)
}

export type LeaveTournamentError = 'TOURNAMENT_STATUS_IS_NOT_SIGNUP' | 'USER_NOT_FOUND_IN_TOURNAMENT' | GetTournamentByIDError
export async function leaveTournament(
  sqlClient: pg.Pool,
  tournamentid: number,
  userID: number
): Promise<Result<{ tournament: tTournament.PublicTournament; registerTeamForNotification: tTournament.RegisterTeam }, LeaveTournamentError>> {
  const tournament = await getPublicTournamentByID(sqlClient, tournamentid)
  if (tournament.isErr()) {
    return err(tournament.error)
  }

  if (tournament.value.status !== 'signUp') {
    return err('TOURNAMENT_STATUS_IS_NOT_SIGNUP')
  }

  const teamIndex = tournament.value.registerTeams.findIndex((r) => {
    return r.playerids.includes(userID)
  })
  if (teamIndex === -1) {
    return err('USER_NOT_FOUND_IN_TOURNAMENT')
  }
  const playerIndex = tournament.value.registerTeams[teamIndex].playerids.indexOf(userID)
  if (playerIndex === -1) {
    return err('USER_NOT_FOUND_IN_TOURNAMENT')
  }

  tournament.value.registerTeams[teamIndex].activated.splice(playerIndex, 1)
  tournament.value.registerTeams[teamIndex].playerids.splice(playerIndex, 1)
  tournament.value.registerTeams[teamIndex].players.splice(playerIndex, 1)
  const registerTeamForNotification = tournament.value.registerTeams[teamIndex]

  let idsToDelete = [userID]
  if (tournament.value.registerTeams[teamIndex].activated.every((a) => a === false)) {
    idsToDelete = [...idsToDelete, ...tournament.value.registerTeams[teamIndex].playerids]
    tournament.value.registerTeams.splice(teamIndex, 1)
    registerTeamForNotification.playerids = []
    registerTeamForNotification.players = []
    registerTeamForNotification.activated = []
  }

  await sqlClient.query('DELETE FROM tournaments_register WHERE tournamentid = $1 AND userid = ANY($2::int[]);', [tournament.value.id, idsToDelete])

  return ok({ tournament: tournament.value, registerTeamForNotification })
}

export async function endSignupIfComplete(sqlClient: pg.Pool, tournament: tTournament.PublicTournament) {
  if (tournament.registerTeams.filter((t) => t.activated.filter((a) => a === true).length === tournament.playersPerTeam).length < tournament.nTeams) {
    return tournament
  }

  tournament.teams = tournament.registerTeams
    .filter((t) => t.activated.filter((a) => a === true).length === tournament.playersPerTeam)
    .map((r) => {
      return { name: r.name, players: r.players, playerids: r.playerids }
    })
  tournament.registerTeams = tournament.registerTeams.filter((t) => t.activated.filter((a) => a === true).length !== tournament.playersPerTeam)

  tournament.status = 'signUpEnded'
  const dataForUsersToTournaments: { userid: number; tournamentid: number; team_name: string; team_number: number }[] = []
  for (const [i, r] of tournament.teams.entries()) {
    for (const id of r.playerids) {
      dataForUsersToTournaments.push({ team_number: i, team_name: r.name, tournamentid: tournament.id, userid: id })
    }
  }

  await sqlClient.query('UPDATE tournaments SET status=$1 WHERE id=$2;', [tournament.status, tournament.id])
  await sqlClient.query('INSERT INTO users_to_tournaments SELECT m.* FROM json_populate_recordset(null::users_to_tournaments_type, $1::json) AS m;', [
    JSON.stringify(dataForUsersToTournaments),
  ])
  await sqlClient.query('DELETE FROM tournaments_register WHERE tournamentid=$1;', [tournament.id])
  return tournament
}

export async function startSignUpOnCondition(sqlClient: pg.Pool) {
  return sqlClient.query("UPDATE tournaments SET status='signUp' WHERE signup_begin < current_timestamp AND status='signUpWaiting';")
}

export async function endSignUpOnCondition(sqlClient: pg.Pool) {
  const tournaments = await getPublicTournament(sqlClient, { status: 'signUp', signup_deadline: '<' })

  for (let tournament of tournaments) {
    tournament = await endSignupIfComplete(sqlClient, tournament)
    if (tournament.status === 'signUpEnded') {
      tournamentBus.emit('signUpEnded-you-partizipate', {
        tournamentTitle: tournament.title,
        playerids: tournament.teams.flatMap((r) => r.playerids),
      })
      tournamentBus.emit('signUpEnded-you-wont-partizipate', {
        tournamentTitle: tournament.title,
        playerids: tournament.registerTeams.flatMap((r) => r.playerids),
      })
    } else {
      tournament.status = 'signUpFailed'

      const playerids: number[] = []
      for (const registerTeam of tournament.registerTeams) {
        for (let playerIndex = 0; playerIndex < registerTeam.activated.length; playerIndex++) {
          if (registerTeam.activated[playerIndex]) {
            playerids.push(registerTeam.playerids[playerIndex])
          }
        }
      }

      await sqlClient.query("UPDATE tournaments SET status='signUpFailed' WHERE id = $1;", [tournament.id])
      tournamentBus.emit('signUp-failed', { tournamentTitle: tournament.title, playerids: playerids })
    }
  }
}
