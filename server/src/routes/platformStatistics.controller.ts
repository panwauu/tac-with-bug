import type express from 'express'
import type { PlatformFunFacts, PlatformStats } from '../sharedTypes/typesPlatformStatistic'
import { Controller, Get, Route, Request } from 'tsoa'
import { getPlatformStatistic, getPlatformFunFacts } from '../services/platformStatistic'

@Route('/')
export class PlatformStatisticController extends Controller {
  /**
   * Get platform fun facts
   */
  @Get('/getPlatformFunFacts')
  public async getPlatformFunFacts(@Request() request: express.Request): Promise<PlatformFunFacts> {
    return await getPlatformFunFacts(request.app.locals.sqlClient)
  }

  /**
   * Get basic platform stats
   */
  @Get('/getPlatformStats')
  public async getPlatformStats(@Request() request: express.Request): Promise<PlatformStats> {
    return await getPlatformStatistic(request.app.locals.sqlClient)
  }
}
