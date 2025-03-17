import type express from 'express'
import type { PlatformFunFacts, PlatformStats } from '../sharedTypes/typesPlatformStatistic'
import { Controller, Get, Route, Request, Res, TsoaResponse } from 'tsoa'
import { getPlatformStatistic, getPlatformFunFacts } from '../services/platformStatistic'

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
   * Get the npm package version
   */
  @Get('/getServerVersion')
  public getServerVersion(@Res() serverError: TsoaResponse<500, string>): string {
    if (process.env.npm_package_version != null) {
      return process.env.npm_package_version
    }
    return serverError(500, 'NPM package version not found')
  }
}
