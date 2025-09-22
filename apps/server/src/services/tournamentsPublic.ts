import logger from '../helpers/logger'
import type pg from 'pg'
import type * as tTournament from '../sharedTypes/typesTournament'
import type * as dbGame from '@repo/core/types/typesDBgame'

import { colors } from '../sharedDefinitions/colors'
import { shuffleArray } from '@repo/core/game/cardUtils'
import { abortGame, createGame } from './game'
import { err, ok, Result } from 'neverthrow'
import { evaluateGameWinnerAndReturnEndedFlag, EvaluateGameWinnerAndReturnEndedFlagError, updateScore } from './tournamentKO'
import { pushChangedPublicTournament } from '../socket/tournamentPublic'
import { updateTournamentWinners } from '../socket/tournament'
import { getSocketByUserID } from '../socket/general'
import { emitGamesUpdate, emitRunningGamesUpdate } from '../socket/games'
import { tournamentBus } from './tournaments'
import { switchFromTeamsOrderToGameOrder } from '@repo/core/game/teamUtils'

interface GetTournamentCondition {
  id?: number
  ids?: number[]
  status?: string
  signup_begin?: '<' | '>' | '<=' | '>='
  signup_deadline?: '<' | '>' | '<=' | '>='
  'creation_dates[cp]'?: '<' | '>' | '<=' | '>='
  'creation_dates[cp-1]+tpg'?: '<' | '>' | '<=' | '>='
  current?: boolean
}

export async function getPublicTournament(sqlClient: pg.Pool, condition?: GetTournamentCondition): Promise<tTournament.PublicTournament[]> {
  // Build Where Clause
  let whereClause = ''
  const values: any[] = []
  if (
    condition?.id != null ||
    condition?.ids != null ||
    condition?.status != null ||
    condition?.signup_begin != null ||
    condition?.signup_deadline != null ||
    condition?.current != null ||
    condition?.['creation_dates[cp]'] != null ||
    condition?.['creation_dates[cp-1]+tpg'] != null
  ) {
    const clauses: string[] = []
    if (condition?.id != null) {
      clauses.push(`tournaments.id = $${clauses.length + 1}`)
      values.push(condition.id)
    }
    if (condition?.ids != null) {
      clauses.push(`tournaments.id = ANY($${clauses.length + 1}::integer[])`)
      values.push(condition.ids)
    }
    if (condition?.status != null) {
      clauses.push(`status = $${clauses.length + 1}`)
      values.push(condition.status)
    }
    if (condition?.signup_begin != null) {
      clauses.push(`signup_begin ${condition.signup_begin} current_timestamp`)
    }
    if (condition?.signup_deadline != null) {
      clauses.push(`signup_deadline ${condition.signup_deadline} current_timestamp`)
    }
    if (condition?.['creation_dates[cp]'] != null) {
      clauses.push(`creation_dates[creation_phase] ${condition['creation_dates[cp]']} current_timestamp`)
    }
    if (condition?.['creation_dates[cp-1]+tpg'] != null) {
      clauses.push(`creation_dates[creation_phase - 1] + time_per_game ${condition['creation_dates[cp-1]+tpg']} current_timestamp`)
    }

    whereClause += clauses.length > 0 ? ' WHERE ' + clauses.join(' AND ') : ''
    whereClause +=
      condition?.current != null
        ? ` ORDER BY 
        CASE WHEN status = 'ended' OR status = 'signUpFailed' THEN 1 ELSE 0 END,
        CASE WHEN creation_dates[1] < current_timestamp THEN current_timestamp - creation_dates[1] ELSE creation_dates[1] - current_timestamp END
        LIMIT 1`
        : ''
  }

  const rows = await sqlClient
    .query(
      `
    SELECT (
        SELECT coalesce(json_agg(tTeams), '[]') FROM (
            SELECT 
                MAX(users_to_tournaments.team_name) as name,
                array_agg(users.username) as players,
                array_agg(users_to_tournaments.userid) as playerIDs
            FROM users_to_tournaments JOIN users ON users.id = users_to_tournaments.userid
            WHERE users_to_tournaments.tournamentid = tournaments.id
            GROUP BY users_to_tournaments.team_number ORDER BY team_number
        ) as tTeams ) as teams,
        (SELECT coalesce(json_agg(tRegister), '[]') FROM (
            SELECT 
                tournaments_register.team_name as name,
                array_agg(users.username) as players,
                array_agg(tournaments_register.userid) as playerIDs,
                array_agg(tournaments_register.activated) as activated
            FROM tournaments_register JOIN users ON users.id = tournaments_register.userid
            WHERE tournaments_register.tournamentid = tournaments.id
            GROUP BY tournaments_register.team_name
        ) as tRegister ) as register_teams,
        id, n_teams, players_per_team, teams_per_match, tournament_type, title, status, signup_begin, signup_deadline, creation_dates, creation_phase,
        TO_CHAR(time_per_game,'HH24:MI') as time_per_game, data
    FROM tournaments ${whereClause}`,
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
      signupBegin: row.signup_begin,
      signupDeadline: row.signup_deadline,
      creationDates: row.creation_dates,
      creationPhase: row.creation_phase,
      timePerGame: row.time_per_game,
      data: row.data,
      teams: row.teams,
      registerTeams: row.register_teams,
      nTeams: row.n_teams,
      playersPerTeam: row.players_per_team,
      tournamentType: row.tournament_type,
      teamsPerMatch: row.teams_per_match,
    }
  })
}

export type GetTournamentByIDError = 'TOURNAMENT_ID_NOT_FOUND'
export async function getPublicTournamentByID(sqlClient: pg.Pool, id: number): Promise<Result<tTournament.PublicTournament, GetTournamentByIDError>> {
  const tournaments = await getPublicTournament(sqlClient, { id: id })
  return tournaments.length !== 1 ? err('TOURNAMENT_ID_NOT_FOUND') : ok(tournaments[0])
}

export async function startTournament(sqlClient: pg.Pool) {
  const tournaments = await getPublicTournament(sqlClient, { status: 'signUpEnded', 'creation_dates[cp]': '<' })

  for (let tournament of tournaments) {
    logger.info(`Starte Tournament: ${tournament.title}`)

    const createGamesResult = await createGamesTournament(sqlClient, tournament)
    if (createGamesResult.isErr()) {
      logger.error(createGamesResult.error)
      return
    }
    tournament = createGamesResult.value

    await sqlClient.query('UPDATE tournaments SET status=$1, creation_phase=$2, data=$3 WHERE id=$4;', ['running', tournament.creationPhase + 1, tournament.data, tournament.id])
    tournamentBus.emit('started', { tournamentTitle: tournament.title })

    const changedTournament = await getPublicTournamentByID(sqlClient, tournament.id)
    if (changedTournament.isErr()) {
      throw new Error('Tournament not found')
    }
    pushChangedPublicTournament(changedTournament.value)
  }
}

export type CreateGamesTournamentError = 'GAMES_ALREADY_CREATED_OR_NOT_ALL_ENDED'
async function createGamesTournament(sqlClient: pg.Pool, tournament: tTournament.PublicTournament): Promise<Result<tTournament.PublicTournament, CreateGamesTournamentError>> {
  if (
    tournament.data.brackets[tournament.creationPhase - 1].some((b) => {
      return b.teams.some((t) => t === -1) || b.gameID !== -1
    })
  ) {
    return err('GAMES_ALREADY_CREATED_OR_NOT_ALL_ENDED')
  }

  for (const bracket of tournament.data.brackets[tournament.creationPhase - 1]) {
    let playerids: number[] = []
    bracket.teams.forEach((t) => {
      playerids = playerids.concat(tournament.teams[t].playerids)
    })

    const playeridsOrdered = switchFromTeamsOrderToGameOrder(playerids, tournament.playersPerTeam * tournament.teamsPerMatch, tournament.teamsPerMatch)

    const colorsForGame = [...colors]
    shuffleArray(colorsForGame)
    const createdGame = await createGame(
      sqlClient,
      2,
      playeridsOrdered,
      playerids.map(() => null),
      true,
      false,
      colorsForGame,
      tournament.id,
      undefined
    )

    createdGame.playerIDs.forEach((id) => {
      const socket = getSocketByUserID(id ?? -1)
      socket != null && emitGamesUpdate(sqlClient, socket)
    })

    bracket.gameID = createdGame.id
    logger.info(`Neues Spiel erstellt: ${createdGame.id}`)
  }

  emitRunningGamesUpdate(sqlClient)

  return ok(tournament)
}

export async function startTournamentRound(sqlClient: pg.Pool) {
  const tournaments = await getPublicTournament(sqlClient, { status: 'running', 'creation_dates[cp]': '<' })

  for (let tournament of tournaments) {
    logger.info(`Starte Runde ${tournament.creationPhase} Tournament ${tournament.title}`)
    const createGamesResult = await createGamesTournament(sqlClient, tournament)
    if (createGamesResult.isErr()) {
      logger.error(createGamesResult.error)
      return
    }
    tournament = createGamesResult.value

    await sqlClient.query('UPDATE tournaments SET creation_phase=$1, data=$2 WHERE id=$3;', [tournament.creationPhase + 1, tournament.data, tournament.id])
    tournamentBus.emit('round-started', { tournamentTitle: tournament.title, roundsToFinal: tournament.data.brackets.length + 1 - tournament.creationPhase })

    const changedTournament = await getPublicTournamentByID(sqlClient, tournament.id)
    if (changedTournament.isErr()) {
      throw new Error('Tournament not found')
    }
    pushChangedPublicTournament(changedTournament.value)
  }
}

export async function checkForceGameEnd(sqlClient: pg.Pool) {
  const tournaments = await getPublicTournament(sqlClient, { status: 'running', 'creation_dates[cp-1]+tpg': '<' })

  for (const tournament of tournaments) {
    if (tournament.data.brackets[tournament.creationPhase - 2].every((m) => m.winner !== -1)) {
      continue
    }

    logger.info('force game end')
    for (const match of tournament.data.brackets[tournament.creationPhase - 2]) {
      if (match.winner === -1) {
        await abortGame(sqlClient, match.gameID)
      }
    }
  }
}

export type UpdateTournamentFromGameError = 'GAME_IS_NOT_PART_OF_PUBLIC_TOURNAMENT' | GetTournamentByIDError | EvaluateGameWinnerAndReturnEndedFlagError
export async function updateTournamentFromGame(pgPool: pg.Pool, game: dbGame.GameForPlay, forceGameEnd?: boolean): Promise<Result<null, UpdateTournamentFromGameError>> {
  if (game.publicTournamentId == null) {
    return err('GAME_IS_NOT_PART_OF_PUBLIC_TOURNAMENT')
  }

  const tournamentResult = await getPublicTournamentByID(pgPool, game.publicTournamentId)
  if (tournamentResult.isErr()) {
    return err(tournamentResult.error)
  }
  const tournament = tournamentResult.value

  let changed = false
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
      changed = true
    }
  }

  if (changed) {
    await pgPool.query('UPDATE tournaments SET status=$1, data=$2 WHERE id = $3;', [tournament.status, tournament.data, tournament.id])
    pushChangedPublicTournament(tournament)
    if (tournament.status === 'ended') {
      updateTournamentWinners(pgPool)
      const winnerTeam = tournament.teams[tournament.data.brackets[tournament.data.brackets.length - 1][0].winner]
      tournamentBus.emit('ended', { tournamentTitle: tournament.title, winner: winnerTeam })
    } else if (tournament.data.brackets[tournament.creationPhase - 2].every((m) => m.winner !== -1)) {
      tournamentBus.emit('round-ended', { tournamentTitle: tournament.title, roundsToFinal: tournament.data.brackets.length + 1 - tournament.creationPhase })
    }
  }
  return ok(null)
}

export async function getCurrentPublicTournament(sqlClient: pg.Pool) {
  return getPublicTournament(sqlClient, { current: true }).then((res) => {
    return res[0]
  })
}
