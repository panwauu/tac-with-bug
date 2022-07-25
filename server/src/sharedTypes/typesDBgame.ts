//import type { AbstractClassGame as game } from './game'
import { Game } from '../game/game'
import type { BallsType } from './typesBall'
import type { PlayerCard } from './typesCard'
import type { GameStatistic } from './typesStatistic'
import type { Player } from './typesPlayers'
import { Replacement } from './game'

interface GameGeneral {
  id: number
  status: string
  nPlayers: number
  nTeams: number
  coop: boolean
  created: number
  lastPlayed: number
  publicTournamentId: number | null
  privateTournamentId: number | null
  players: string[]
  playerIDs: number[]
}

// Game from db
export interface GameForOverview extends GameGeneral {
  coop: boolean
  teams: string[][]
  nPlayer: number
}

export interface GameForPlay extends GameGeneral {
  game: Game
  colors: string[]
  rematch_open: boolean
}

export interface UpdateDataType {
  gamePlayer: number
  tournamentID: number | null
  discardPile: string[]
  balls: BallsType
  priorBalls: BallsType
  cards: PlayerCard[]
  ownCards: string[]
  players: Player[]
  gameEnded: boolean
  winningTeams: boolean[]
  aussetzenFlag: boolean
  teufelFlag: boolean
  discardedFlag: boolean
  status: string
  coopCounter: number
  statistic: GameStatistic[]
  tradeDirection: number
  deckInfo: number[]
  colors: string[]
  created: number
  lastPlayed: number
  rematch_open: boolean
  replacedPlayerIndices: number[]
  replacement?: Replacement
}

export type GetGamesType = {
  open: number
  aborted: number
  won: number
  lost: number
  team: number
  history: (1 | 0 | 2)[]
  runningGames: GameForOverview[]
}

export type GetRunningGamesType = {
  id: number
  teams: string[][]
  created: number
  lastPlayed: number
}
