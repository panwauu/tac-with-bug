import type express from 'express'
import type { tournamentParticipation } from '../sharedTypes/typesTournament'
import type { playerFrontendStatistic } from '../sharedTypes/typesPlayerStatistic'
import { Controller, Get, Query, Route, Request } from 'tsoa'

import type { userNetworkApiResponse } from '../sharedTypes/typesStatistic'
import { getUserNetworkData } from '../services/playerStatistic'
import { getDataForProfilePage } from '../services/playerStatistic'
import { getTournamentParticipations } from '../services/tournaments'

@Route('/profile')
export class PlayerStatisticController extends Controller {
  /**
   * Get statistics of one player
   */
  @Get('/getPlayerStats')
  public async getPlayerStats(@Request() request: express.Request, @Query() username: string): Promise<playerFrontendStatistic> {
    return getDataForProfilePage(request.app.locals.sqlClient, username)
  }

  /**
   * Get social graph for certain player by username
   */
  @Get('/userNetwork')
  public async getProfileUserNetwork(@Request() request: express.Request, @Query() username: string): Promise<userNetworkApiResponse> {
    return getUserNetworkData(request.app.locals.sqlClient, username)
  }

  /**
   * Get tournament participations of certain player by username
   */
  @Get('/userTournamentParticipations')
  public async getUserTournamentParticipations(@Request() request: express.Request, @Query() username: string): Promise<tournamentParticipation[]> {
    return getTournamentParticipations(request.app.locals.sqlClient, username)
  }
}
