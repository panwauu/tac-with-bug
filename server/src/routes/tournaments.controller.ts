import type express from 'express'
import { Controller, Get, Post, Body, Route, Request, Security, Query, TsoaResponse, Res, Tags } from 'tsoa'

import { createTournament } from '../services/tournamentsManualEditing'
import { endSignupIfComplete } from '../services/tournamentsRegister'
import { getDifferentName } from '../services/SweetNameGenerator'
import type { PublicTournament } from '../sharedTypes/typesTournament'
import { getPublicTournamentByID } from '../services/tournamentsPublic'
import { registerJobsForOneTournament } from '../services/scheduledTasks'
import { createTournamentDataKO } from '../services/tournamentKO'

@Tags('Tournament')
@Route('/')
export class TournamentsController extends Controller {
  /**
   * Generate a unique teamname for a tournament
   */
  @Get('/generateTeamName')
  public async generateTournamentTeamName(
    @Request() request: express.Request,
    @Query() tournamentID: number,
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ): Promise<string> {
    const namesRes = await request.app.locals.sqlClient.query('SELECT DISTINCT team_name FROM tournaments_register WHERE tournamentid=$1;', [tournamentID])
    const result = getDifferentName(namesRes.rows.map((r: any) => r.team_name))
    if (result.isErr()) {
      return serverError(500, { message: result.error })
    }
    return result.value
  }

  /**
   * Create a tournament
   */
  @Security('jwt', ['admin'])
  @Post('/createTournament')
  public async createTournament(
    @Request() request: express.Request,
    @Body()
    requestBody: {
      /**
       * @example "Test Tournament"
       */
      title: string
      /**
       * @example "2029-02-20 00:00:00+01"
       */
      begin: string
      /**
       * @example "2029-02-21 00:00:00+01"
       */
      deadline: string
      /**
       * @example ["2029-02-22 00:00:00+01", "2029-02-23 00:00:00+01", "2029-02-24 00:00:00+01"]
       */
      creationDates: string[]
      /**
       * @example 4440
       */
      secondsPerGame: number
      /**
       * @example 8
       */
      nTeams: number
    },
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ): Promise<PublicTournament> {
    const tournament = await createTournament(
      request.app.locals.sqlClient,
      requestBody.title,
      requestBody.begin,
      requestBody.deadline,
      requestBody.creationDates,
      requestBody.secondsPerGame,
      requestBody.nTeams,
      2,
      2,
      'KO'
    )
    if (tournament.isErr()) {
      return serverError(500, { message: 'Internal Server Error', details: tournament.error })
    }
    registerJobsForOneTournament(request.app.locals.sqlClient, tournament.value)
    return tournament.value
  }

  //End game
  // tournamentID
  // gameIndex
  // winningTeamName
  // 1) Check if game is active
  // 2) Check if winningTeam is included in Game
  // 3) End Game

  /**
   * Exchange user in tournament
   */
  @Security('jwt', ['admin'])
  @Post('/exchangeUser')
  public async exchangeTournamentUser(
    @Request() request: express.Request,
    @Body() requestBody: { usernameToReplace: string; usernameOfReplacement: string; tournamentID: number },
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ): Promise<void> {
    const tournament = await getPublicTournamentByID(request.app.locals.sqlClient, requestBody.tournamentID)
    if (tournament.isErr()) return serverError(500, { message: tournament.error })
    if (tournament.value.status !== 'signUpEnded' && tournament.value.status !== 'running') {
      return serverError(500, { message: 'Tournament should in running or signUpEnded status' })
    }

    const idRes = await request.app.locals.sqlClient.query('SELECT id, username FROM users WHERE username = $1 OR username = $2;', [
      requestBody.usernameToReplace,
      requestBody.usernameOfReplacement,
    ])

    const userIDToReplace = idRes.rows.find((r: any) => r.username === requestBody.usernameToReplace)?.id
    const userIDOfReplacement = idRes.rows.find((r: any) => r.username === requestBody.usernameOfReplacement)?.id

    if (userIDToReplace === undefined || userIDOfReplacement === undefined || userIDOfReplacement === userIDToReplace) return serverError(500, { message: 'Usernames not found' })

    const updateRes = await request.app.locals.sqlClient.query('UPDATE users_to_tournaments SET userid = $2 WHERE userid = $1 AND tournamentid = $3;', [
      userIDToReplace,
      userIDOfReplacement,
      requestBody.tournamentID,
    ])
    if (updateRes.rowCount !== 1) {
      return serverError(500, { message: 'Could not update database' })
    }
  }

  /**
   * Exchange user in tournament
   */
  @Security('jwt', ['admin'])
  @Post('/changeTournamentSignUpSize')
  public async changeTournamentSignUpSize(
    @Request() request: express.Request,
    @Body() requestBody: { nTeams: number; tournamentID: number; creationDates?: string[] },
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ): Promise<PublicTournament> {
    const tournament = await getPublicTournamentByID(request.app.locals.sqlClient, requestBody.tournamentID)
    if (tournament.isErr()) return serverError(500, { message: tournament.error })
    if (tournament.value.status !== 'signUpWaiting' && tournament.value.status !== 'signUp') {
      return serverError(500, { message: 'Tournament should in signup or waiting for signup status' })
    }

    if (tournament.value.tournamentType !== 'KO') return serverError(500, { message: 'NOT IMPLEMENTED' })

    const tournamentDataKO = createTournamentDataKO(requestBody.nTeams, tournament.value.teamsPerMatch)
    if (tournamentDataKO.isErr()) return serverError(500, { message: tournamentDataKO.error })

    const newCreationDates = requestBody.creationDates ?? tournament.value.creationDates.slice(0, tournamentDataKO.value.brackets.length)
    if (newCreationDates.length !== tournamentDataKO.value.brackets.length) return serverError(500, { message: 'wrong creation date length' })

    const updateRes = await request.app.locals.sqlClient.query(
      "UPDATE tournaments SET n_teams = $1, data = $3, creation_dates = $4 WHERE (status = 'signUp' OR  status = 'signUpWaiting') AND id = $2;",
      [requestBody.nTeams, requestBody.tournamentID, JSON.stringify(tournamentDataKO.value), newCreationDates]
    )
    if (updateRes.rowCount !== 1) return serverError(500, { message: 'Could not Update Database' })

    const newTournament = await getPublicTournamentByID(request.app.locals.sqlClient, requestBody.tournamentID)
    if (newTournament.isErr()) return serverError(500, { message: newTournament.error })
    return await endSignupIfComplete(request.app.locals.sqlClient, newTournament.value)
  }
}
