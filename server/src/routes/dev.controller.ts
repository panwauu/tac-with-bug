import type express from 'express'
import { Controller, Get, Query, Route, Request, Security, TsoaResponse, Res, Tags } from 'tsoa'

import { retrieveCapturedGame } from '../services/capture'
import { getEmailsFromUsersForNews } from '../services/settings'

@Route('/')
@Tags('Dev')
export class DevController extends Controller {
  /**
   * Get capture
   */
  @Security('jwt', ['admin'])
  @Get('/retrieveCapture')
  public async retrieveCapturedGame(@Request() request: express.Request, @Query() gameID: number): Promise<string> {
    const dbRes = await retrieveCapturedGame(request.app.locals.sqlClient, gameID)
    let resultingString = ''
    dbRes.rows[0].game.forEach((row: any, index: any) => (resultingString += JSON.stringify(row) + (index !== dbRes.rows[0].game.length - 1 ? '\r\n' : '')))
    return resultingString
  }

  /*
    @Security('jwt', ['admin'])
    @Post('/insertCapture')
    public async insertCapture(
        @Request() request: express.Request,
        @Body() reqBody: { gameID: number, game: string },
    ): Promise<number> {
        const dbRes = await insertCompleteCapture(request.app.locals.sqlClient, reqBody.gameID, reqBody.game)
        return dbRes.rowCount
    }
    */

  /*
    @Security('jwt', ['admin'])
    @Get("/removeCaptures")
    public async removeCaptures(
        @Request() request: express.Request,
    ): Promise<void> {
        await removeCapturedGames(request.app.locals.sqlClient)
    }
    */

  @Security('jwt', ['admin'])
  @Get('/getEmailsFromUsersForNews')
  public async getEmailsFromUsersForNews(@Request() request: express.Request, @Query() type: 'news' | 'tournamentNews', @Res() serverError: TsoaResponse<500, string>) {
    try {
      return await getEmailsFromUsersForNews(request.app.locals.sqlClient, type)
    } catch (err) {
      return serverError(500, (err as any)?.message)
    }
  }
}
