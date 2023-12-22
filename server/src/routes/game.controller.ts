import type express from 'express'
import { Controller, Get, Query, Route, Request, Security, Delete, Body, Res, TsoaResponse } from 'tsoa'

import { getGame, abortGame } from '../services/game.js'

@Route('/')
export class GameController extends Controller {
  /**
   * Search for players with similar name
   */
  @Get('/searchPlayers')
  public async searchPlayers(@Request() request: express.Request, @Query() searchString: string, @Query() nResults: number): Promise<{ username: string; id: number }[]> {
    const dbRes = await request.app.locals.sqlClient.query(
      "Select username, id from users WHERE username ~* ('.*' || $1 || '.*') AND id > 1 ORDER BY CASE WHEN username =$1 THEN 0 ELSE CHAR_LENGTH(username) END LIMIT $2;",
      [searchString, nResults]
    )
    return dbRes.rows.map((entry: any) => {
      return { username: entry.username, id: entry.id }
    })
  }

  /**
   * Delete or Abort a game
   */
  @Security('jwt')
  @Delete('/abortGame')
  public async abortGame(@Request() request: express.Request, @Body() requestBody: { gameID: number }, @Res() authorizationError: TsoaResponse<403, any>): Promise<void> {
    const game = await getGame(request.app.locals.sqlClient, requestBody.gameID)
    if (!game.playerIDs.includes(request.userData.userID)) {
      return authorizationError(403, 'You are not allowed to access this Game and Player')
    }

    if (game.publicTournamentId != null || game.privateTournamentId != null) {
      return authorizationError(403, 'You cannot abort a tournament game')
    }

    if (Date.now() - game.created >= 1000 * 60 * 5) {
      return authorizationError(403, 'You cannot abort a game older than 5 minutes')
    }

    await abortGame(request.app.locals.sqlClient, requestBody.gameID)
  }
}
