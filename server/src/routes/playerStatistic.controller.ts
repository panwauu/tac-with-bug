import type express from 'express'
import type { TournamentParticipation } from '../sharedTypes/typesTournament.js'
import type { PlayerFrontendStatistic } from '../sharedTypes/typesPlayerStatistic.js'
import { Controller, Get, Query, Route, Request } from 'tsoa'

import type { UserNetworkApiResponse } from '../sharedTypes/typesStatistic.js'
import { getUserNetworkData, getDataForProfilePage } from '../services/playerStatistic.js'
import { getTournamentParticipations } from '../services/tournaments.js'

@Route('/profile')
export class PlayerStatisticController extends Controller {
  /**
   * Get statistics of one player
   */
  @Get('/getPlayerStats')
  public async getPlayerStats(@Request() request: express.Request, @Query() username: string): Promise<PlayerFrontendStatistic> {
    return getDataForProfilePage(request.app.locals.sqlClient, username)
  }

  /**
   * Get social graph for certain player by username
   */
  @Get('/userNetwork')
  public async getProfileUserNetwork(@Request() request: express.Request, @Query() username: string): Promise<UserNetworkApiResponse> {
    return getUserNetworkData(request.app.locals.sqlClient, username)
  }

  /**
   * Get tournament participations of certain player by username
   */
  @Get('/userTournamentParticipations')
  public async getUserTournamentParticipations(@Request() request: express.Request, @Query() username: string): Promise<TournamentParticipation[]> {
    return getTournamentParticipations(request.app.locals.sqlClient, username)
  }
}
