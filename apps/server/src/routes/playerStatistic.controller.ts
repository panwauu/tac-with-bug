import type express from 'express'
import type { TournamentParticipation } from '../sharedTypes/typesTournament'
import type { PlayerFrontendStatistic, ProfileGames } from '../sharedTypes/typesPlayerStatistic'
import { Controller, Get, Query, Route, Request } from 'tsoa'
import { getDataForProfilePage } from '../services/playerStatistic'
import { getTournamentParticipations } from '../services/tournaments'

@Route('/profile')
export class PlayerStatisticController extends Controller {
  /**
   * Get statistics of one player
   * @param games all games (default), only games of humans or only games with bots
   */
  @Get('/getPlayerStats')
  public async getPlayerStats(@Request() request: express.Request, @Query() username: string, @Query() games?: ProfileGames): Promise<PlayerFrontendStatistic> {
    return getDataForProfilePage(request.app.locals.sqlClient, username, games ?? 'all')
  }

  /**
   * Get tournament participations of certain player by username
   */
  @Get('/userTournamentParticipations')
  public async getUserTournamentParticipations(@Request() request: express.Request, @Query() username: string): Promise<TournamentParticipation[]> {
    return getTournamentParticipations(request.app.locals.sqlClient, username)
  }
}
