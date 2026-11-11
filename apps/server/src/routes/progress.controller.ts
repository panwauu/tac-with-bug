import type express from 'express'
import type { Progress, ProgressChange } from '../sharedTypes/typesProgress'
import { Controller, Get, Post, Body, Route, Request, Security, TsoaResponse, Res } from 'tsoa'
import { addProgress, AddProgressError, getProgress } from '../services/progress'

@Route('/')
export class ProgressController extends Controller {
  /**
   * Get the progress of the user outside of the online games: statistics of games against the AI, achievements and finished lessons
   */
  @Security('jwt')
  @Get('/getProgress')
  public async getProgress(@Request() request: express.Request): Promise<Progress> {
    return getProgress(request.app.locals.sqlClient, request.userData.userID)
  }

  /**
   * Add what a device has collected since its last change and get the progress of the user after it.
   * A change with an id that was already applied changes nothing, so a device can safely send it again.
   */
  @Security('jwt')
  @Post('/addProgress')
  public async addProgress(@Request() request: express.Request, @Body() change: ProgressChange, @Res() validationError: TsoaResponse<409, AddProgressError>): Promise<Progress> {
    const progress = await addProgress(request.app.locals.sqlClient, request.userData.userID, change)
    if (progress.isErr()) return validationError(409, progress.error)
    return progress.value
  }
}
