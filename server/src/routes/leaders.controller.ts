import type express from 'express'
import { Controller, Get, Query, Route, Request, TsoaResponse, Res } from 'tsoa'

import type { LeaderBoardType, CoopBoardType } from '../services/leaders'
import { queryLeaderboardByWins, queryLeaderboardCoop } from '../services/leaders'

@Route('/')
export class LeadersController extends Controller {
  /**
   * Get Leaderboard
   */
  @Get('/getWinnerLeaderboard')
  public async getWinnerLeaderboard(
    @Request() request: express.Request,
    @Res() validationError: TsoaResponse<409, any>,
    @Query() limit: number,
    @Query() offset: number,
    @Query() startDate?: number,
    @Query() endDate?: number
  ): Promise<LeaderBoardType> {
    if (!Number.isInteger(limit) || !Number.isInteger(offset)) {
      return validationError(409, 'limit and offset as integer required')
    }

    const startDateNormalized = new Date(startDate || 0)
    const endDateNormalized = endDate === undefined ? new Date(Date.now()) : new Date(endDate)
    if (startDateNormalized >= endDateNormalized) {
      return validationError(409, 'startDate should be smaller than endDate')
    }

    return queryLeaderboardByWins(request.app.locals.sqlClient, limit, offset, startDateNormalized, endDateNormalized)
  }

  /**
   * Get Leaderboard for Team Games
   */
  @Get('/getCoopLeaderboard')
  public async getCoopLeaderboard(
    @Request() request: express.Request,
    @Res() validationError: TsoaResponse<409, any>,
    @Query() limit: number,
    @Query() offset: number,
    @Query() nPlayers: number,
    @Query() startDate?: number,
    @Query() endDate?: number
  ): Promise<CoopBoardType> {
    if (!Number.isInteger(limit) || !Number.isInteger(offset)) {
      return validationError(409, 'limit and offset as integer required')
    }

    const startDateNormalized = new Date(startDate || 0)
    const endDateNormalized = endDate === undefined ? new Date(Date.now()) : new Date(endDate)
    if (startDateNormalized >= endDateNormalized) {
      return validationError(409, 'startDate should be smaller than endDate')
    }

    if (nPlayers !== 4 && nPlayers !== 6) {
      return validationError(409, 'startDate should be smaller than endDate')
    }

    return queryLeaderboardCoop(request.app.locals.sqlClient, limit, offset, nPlayers, startDateNormalized, endDateNormalized)
  }
}

/*
router.get('/getCoopLeaderboard/', isLoggedIn, async (req: express.Request, res: express.Response) => {
    const limit = parseInt(req.query.limit as string)
    const offset = parseInt(req.query.offset as string)
    const nPlayers = parseInt(req.query.nPlayers as string)
    const startDate = new Date(parseInt(req.query.startDate as string) || 0)
    const endDate = new Date(!isNaN(parseInt(req.query.endDate as string)) ? parseInt(req.query.endDate as string) : Date.now())
    if (isNaN(limit) || isNaN(offset)) { return res.status(400).send('limit and offset as integer required') }
    if (nPlayers !== 4 && nPlayers !== 6) { return res.status(400).send('nPlayers needs to be 4 or 6') }
    if (startDate >= endDate) { return res.status(400).send('startDate should be smaller than endDate') }

    const data = await queryLeaderboardCoop(req.app.locals.sqlClient, limit, offset, nPlayers, startDate, endDate)

    return res.status(200).send(data)
})

export default router;*/
