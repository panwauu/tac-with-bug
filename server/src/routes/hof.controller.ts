import { Controller, Get, Route, Request } from 'tsoa'
import type express from 'express'

import { getHofData } from '../services/hof'
import type { HofData } from '../sharedTypes/typesHof'

const cacheTime = 24 * 60 * 60 * 1000 // One Day

/* isLoggedIn - Auth not working @Security("jwt") */

@Route('getHofData')
export class HofController extends Controller {
  /**
   * Retrieves the usernames of all HOF-members by category
   */
  @Get('/')
  public async getHof(@Request() request: express.Request): Promise<HofData> {
    this.setHeader('Cache-control', `public, max-age=${cacheTime}`)
    return getHofData(request.app.locals.sqlClient)
  }
}
