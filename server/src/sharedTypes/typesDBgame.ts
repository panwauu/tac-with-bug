import type { AbstractClassGame as game } from './game'
import type { ballsType } from './typesBall'
import type { playerCard } from './typesCard'
import type { gameStatistic } from './typesStatistic'
import type { player } from './typesPlayers'

interface gameGeneral {
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
export interface gameForOverview extends gameGeneral {
  coop: boolean
  teams: string[][]
  nPlayer: number
}

export interface gameForPlay extends gameGeneral {
  game: game
  colors: string[]
  rematch_open: boolean
}

export interface updateDataType {
  gamePlayer: number
  tournamentID: number | null
  discardPile: string[]
  balls: ballsType
  priorBalls: ballsType
  cards: playerCard[]
  ownCards: string[]
  players: player[]
  gameEnded: boolean
  winningTeams: boolean[]
  aussetzenFlag: boolean
  teufelFlag: boolean
  discardedFlag: boolean
  status: string
  coopCounter: number
  statistic: gameStatistic[]
  tradeDirection: number
  deckInfo: number[]
  colors: string[]
  created: number
  lastPlayed: number
  rematch_open: boolean
}

export type getGamesType = {
  open: number
  aborted: number
  won: number
  lost: number
  team: number
  history: (1 | 0 | 2)[]
  runningGames: gameForOverview[]
}

export type getRunningGamesType = {
  id: number
  teams: string[][]
  created: number
  lastPlayed: number
}
