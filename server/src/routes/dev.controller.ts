import type express from 'express'
import { Controller, Get, Query, Route, Request, Security, TsoaResponse, Res, Tags, Post, Body, Queries, Delete } from 'tsoa'

import { retrieveCapturedGame } from '../services/capture'
import { getEmailsFromUsersForNews } from '../services/settings'
import { editUserDescription, getUser } from '../services/user'
import { selectRandomProfilePicture } from '../services/picture'
import { getModerationData, resetModerationDataOfUser, setModerationData } from '../services/moderation'
import { ModerationData } from '../sharedTypes/typesDBuser'
import Joi from 'joi'

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

  /**
   * Get moderation data (blocking of users)
   */
  @Security('jwt', ['admin'])
  @Get('/moderation')
  public async getModeration(@Request() request: express.Request, @Queries() queries: { userid?: number; email?: string }): Promise<ModerationData[]> {
    const userIdentifier = queries.userid != null ? { id: queries.userid } : queries.email != null ? { email: queries.email } : undefined
    return getModerationData(request.app.locals.sqlClient, userIdentifier)
  }

  /**
   * Post moderation data (blocking of users)
   * customUntil is optional and should be in ISO format. Default value is +60 days.
   */
  @Security('jwt', ['admin'])
  @Post('/moderation')
  public async addModerationData(
    @Request() request: express.Request,
    @Body() data: { username: string; reason: string; customUntil?: string },
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ) {
    const schema = Joi.object({ username: Joi.string().required(), reason: Joi.string().required(), customUntil: Joi.string().isoDate().optional() })
    const { error } = schema.validate(data)
    if (error != null) {
      return serverError(500, error)
    }

    const user = await getUser(request.app.locals.sqlClient, { username: data.username })
    if (user.isErr()) {
      return serverError(500, { message: 'User not found', details: user.error })
    }

    // Reset profile picture
    await selectRandomProfilePicture(request.app.locals.sqlClient, user.value.id)

    // Reset description
    await editUserDescription(request.app.locals.sqlClient, user.value.id, '')

    // Add moderation data
    const date = data.customUntil ?? new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 60).toISOString()
    const res = await setModerationData(request.app.locals.sqlClient, user.value.id, user.value.email, data.reason, date)
    if (res.isErr()) {
      return serverError(500, { message: 'Could not insert moderation data', details: res.error })
    }

    return res.value
  }

  /**
   * Unblock the user. The entries will not be deleted, but the until date will be set to now.
   * Sets all moderation elements of a user that are not expired to expire now.
   */
  @Security('jwt', ['admin'])
  @Delete('/moderation')
  public async deleteModerationData(
    @Request() request: express.Request,
    @Body() data: { username: string },
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>
  ) {
    const schema = Joi.object({ username: Joi.string().required() })
    const { error } = schema.validate(data)
    if (error != null) {
      return serverError(500, error)
    }

    const user = await getUser(request.app.locals.sqlClient, { username: data.username })
    if (user.isErr()) {
      return serverError(500, { message: 'User not found', details: user.error })
    }

    return resetModerationDataOfUser(request.app.locals.sqlClient, user.value.id)
  }
}
