import type express from 'express'
import { Controller, Get, Post, Body, Route, Request, Security, Query, TsoaResponse, Res } from 'tsoa'

import { createTournament } from '../services/tournamentsManualEditing'
import { endSignupIfComplete } from '../services/tournamentsRegister'
import { getDifferentName } from '../services/SweetNameGenerator'
import { publicTournament } from '../../../shared/types/typesTournament'
import { getPublicTournamentByID } from '../services/tournamentsPublic'
import { registerJobsForOneTournament } from '../services/scheduledTasks'

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
    @Body() requestBody: { title: string; begin: string; deadline: string; creationDates: string[]; secondsPerGame: number; nTeams: number },
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ): Promise<publicTournament> {
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
    @Res() usernamesNotFound: TsoaResponse<400, string>
  ): Promise<void> {
    const idRes = await request.app.locals.sqlClient.query('SELECT id, username FROM users WHERE username = $1 OR username = $2;', [
      requestBody.usernameToReplace,
      requestBody.usernameOfReplacement,
    ])

    const userIDToReplace = idRes.rows.find((r: any) => r.username === requestBody.usernameToReplace)?.id
    const userIDOfReplacement = idRes.rows.find((r: any) => r.username === requestBody.usernameOfReplacement)?.id

    if (userIDToReplace === undefined || userIDOfReplacement === undefined) {
      return usernamesNotFound(400, 'Usernames not found')
    }

    const updateRes = await request.app.locals.sqlClient.query('UPDATE users_to_tournaments SET userid = $2 WHERE userid = $1 AND tournamentid = $3;', [
      userIDToReplace,
      userIDOfReplacement,
      requestBody.tournamentID,
    ])
    if (updateRes.rowCount !== 1) {
      return usernamesNotFound(400, 'Invalid input combination')
    }
  }

  /**
   * Exchange user in tournament
   */
  @Security('jwt', ['admin'])
  @Post('/changeTournamentSignUpSize')
  public async changeTournamentSignUpSize(
    @Request() request: express.Request,
    @Body() requestBody: { nTeams: number; tournamentID: number },
    @Res() usernamesNotFound: TsoaResponse<400, string>,
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ): Promise<void> {
    if ((Math.log(requestBody.nTeams) / Math.log(2)) % 1 !== 0) {
      return usernamesNotFound(400, 'nTeams not power of two')
    }

    const tournament = await getPublicTournamentByID(request.app.locals.sqlClient, requestBody.tournamentID)
    if (tournament.isErr()) {
      return serverError(500, { message: tournament.error })
    }

    await endSignupIfComplete(request.app.locals.sqlClient, tournament.value)

    const updateRes = await request.app.locals.sqlClient.query("UPDATE tournaments SET n_teams = $1 WHERE (status = 'signUp' OR  status = 'signUpWaiting') AND id = $2;", [
      requestBody.nTeams,
      requestBody.tournamentID,
    ])
    if (updateRes.rowCount !== 1) {
      return usernamesNotFound(400, 'Could not Update Database')
    }
  }
}
