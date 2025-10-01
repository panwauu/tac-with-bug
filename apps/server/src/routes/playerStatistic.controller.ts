import type express from 'express'
import type { TournamentParticipation } from '../sharedTypes/typesTournament'
import type { PlayerFrontendStatistic, UserNetworkApiResponse } from '../sharedTypes/typesPlayerStatistic'
import { Controller, Get, Query, Route, Request } from 'tsoa'
import { getUserNetworkData, getDataForProfilePage } from '../services/playerStatistic'
import { getTournamentParticipations } from '../services/tournaments'

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
