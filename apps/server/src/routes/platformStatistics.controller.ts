import type express from 'express'
import type { BotStatistic, PlatformFunFacts, PlatformStats } from '../sharedTypes/typesPlatformStatistic'
import { Controller, Get, Route, Request, Res, TsoaResponse } from 'tsoa'
import { getPlatformStatistic, getPlatformFunFacts, getBotStatistic } from '../services/platformStatistic'
import { getRootPackageVersion } from '../entrypoints/version'

@Route('/')
export class PlatformStatisticController extends Controller {
  /**
   * Get platform fun facts
   */
  @Get('/getPlatformFunFacts')
  public async getPlatformFunFacts(@Request() request: express.Request): Promise<PlatformFunFacts> {
    return getPlatformFunFacts(request.app.locals.sqlClient)
  }

  /**
   * Get basic platform stats
   */
  @Get('/getPlatformStats')
  public async getPlatformStats(@Request() request: express.Request): Promise<PlatformStats> {
    return getPlatformStatistic(request.app.locals.sqlClient)
  }

  /**
   * Get statistics per bot: games, players and wins against humans
   */
  @Get('/getBotStats')
  public async getBotStats(@Request() request: express.Request): Promise<BotStatistic[]> {
    return getBotStatistic(request.app.locals.sqlClient)
  }

  /**
   * Get the npm package version
   */
  @Get('/getServerVersion')
  public getServerVersion(@Res() serverError: TsoaResponse<500, string>): string {
    const version = getRootPackageVersion()
    if (version != null) return version
    return serverError(500, 'NPM package version not found')
  }
}
