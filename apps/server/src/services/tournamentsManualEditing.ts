import { err, Result, ok } from 'neverthrow'
import type pg from 'pg'
import type * as tTournament from '../sharedTypes/typesTournament'
import { createTournamentDataKO, CreateTournamentDataKOError } from './tournamentKO'
import { isValidTeamCountKO, numberOfRoundsKO } from '../sharedDefinitions/tournamentKO'

import { getPublicTournamentByID, GetTournamentByIDError } from './tournamentsPublic'

export type CreateTournamentValidationError =
  | 'TITLE_NOT_VALID'
  | 'DATES_NOT_VALID'
  | 'DATES_NOT_IN_ORDER'
  | 'ROUNDS_OVERLAP'
  | 'SECONDS_PER_GAME_NOT_VALID'
  | 'N_TEAMS_NOT_VALID_FOR_KO'
  | 'MIN_TEAMS_NOT_VALID'
  | 'KO_ROUNDS_AND_CREATIONDATES_NOT_SAME_LENGTH'
export type CreateTournamentError = 'ONLY_KO_TOURNAMENT_IMPLEMENTED' | CreateTournamentValidationError | GetTournamentByIDError | CreateTournamentDataKOError

export interface CreateTournamentInput {
  title: string
  begin: string
  deadline: string
  creationDates: string[]
  secondsPerGame: number
  // Maximum number of teams
  nTeams: number
  // Minimum number of teams for a tournament with a fluid size, equal to nTeams (or undefined) for a fixed size
  minTeams?: number
  playersPerTeam: 2 | 3
  teamsPerMatch: 2 | 3
  tournamentType: 'KO'
}

export function validateTournamentInput(input: CreateTournamentInput): Result<null, CreateTournamentValidationError> {
  if (input.title.trim().length === 0 || input.title.length > 50) {
    return err('TITLE_NOT_VALID')
  }
  if (!Number.isInteger(input.secondsPerGame) || input.secondsPerGame < 0) {
    return err('SECONDS_PER_GAME_NOT_VALID')
  }

  const dates = [input.begin, input.deadline, ...input.creationDates].map((d) => Date.parse(d))
  if (dates.some((d) => Number.isNaN(d))) {
    return err('DATES_NOT_VALID')
  }
  for (let i = 1; i < dates.length; i++) {
    if (dates[i - 1] >= dates[i]) {
      return err('DATES_NOT_IN_ORDER')
    }
  }
  // The next round can only start when all games of the previous round are ended
  const roundDates = dates.slice(2)
  for (let i = 1; i < roundDates.length; i++) {
    if (roundDates[i - 1] + input.secondsPerGame * 1000 > roundDates[i]) {
      return err('ROUNDS_OVERLAP')
    }
  }

  if (input.teamsPerMatch === 2 && !isValidTeamCountKO(input.nTeams)) {
    return err('N_TEAMS_NOT_VALID_FOR_KO')
  }
  if (input.teamsPerMatch === 2 && input.creationDates.length !== numberOfRoundsKO(input.nTeams)) {
    return err('KO_ROUNDS_AND_CREATIONDATES_NOT_SAME_LENGTH')
  }
  if (input.minTeams != null && input.minTeams !== input.nTeams) {
    // A fluid size needs byes, which only exist for matches of two teams
    if (input.teamsPerMatch !== 2 || !isValidTeamCountKO(input.minTeams) || input.minTeams > input.nTeams) {
      return err('MIN_TEAMS_NOT_VALID')
    }
  }

  return ok(null)
}

export async function createTournament(sqlClient: pg.Pool, input: CreateTournamentInput): Promise<Result<tTournament.PublicTournament, CreateTournamentError>> {
  const validation = validateTournamentInput(input)
  if (validation.isErr()) {
    return err(validation.error)
  }

  if (input.tournamentType !== 'KO') {
    return err('ONLY_KO_TOURNAMENT_IMPLEMENTED')
  }
  // The bracket for the maximum number of teams. It is drawn again with the participating teams when the sign up ends.
  const dataRes = createTournamentDataKO(input.nTeams, input.teamsPerMatch)
  if (dataRes.isErr()) {
    return err(dataRes.error)
  }
  if (input.creationDates.length !== dataRes.value.brackets.length) {
    return err('KO_ROUNDS_AND_CREATIONDATES_NOT_SAME_LENGTH')
  }
  const data: tTournament.TournamentDataKO = dataRes.value
  const minTeams = input.minTeams == null || input.minTeams === input.nTeams ? null : input.minTeams

  const dbRes = await sqlClient.query(
    `INSERT INTO tournaments (title, status, signup_begin, signup_deadline, creation_dates, time_per_game, n_teams, players_per_team, tournament_type, data, teams_per_match, min_teams)
        VALUES ($1, 'signUpWaiting', $2, $3, $4, $5 * INTERVAL '1 second', $6, $7, $8, $9, $10, $11) RETURNING *;
        `,
    [
      input.title.trim(),
      input.begin,
      input.deadline,
      input.creationDates,
      input.secondsPerGame,
      input.nTeams,
      input.playersPerTeam,
      input.tournamentType,
      data,
      input.teamsPerMatch,
      minTeams,
    ]
  )
  const tournament = await getPublicTournamentByID(sqlClient, dbRes.rows[0].id)
  if (tournament.isErr()) {
    return err(tournament.error)
  }
  return ok(tournament.value)
}
