import type { Game } from '../game/game.js'
import type { BallsType } from './typesBall.js'
import type { PlayerCard } from './typesCard.js'
import type { GameStatistic } from './typesStatistic.js'
import type { Player } from './typesPlayers.js'
import type { Substitution } from './game.js'

interface GameGeneral {
  id: number
  running: boolean
  nPlayers: number
  nTeams: number
  coop: boolean
  created: number
  lastPlayed: number
  publicTournamentId: number | null
  privateTournamentId: number | null
  players: (string | null)[]
  playerIDs: (number | null)[]
}

// Game from db
export interface GameForOverview extends GameGeneral {
  status: string
  coop: boolean
  teams: string[][]
  nPlayer: number
}

export interface GameForPlay extends GameGeneral {
  game: Game
  colors: string[]
  rematch_open: boolean
  substitution: Substitution | null
}

export interface UpdateDataType {
  gamePlayer: number
  publicTournamentId: number | null
  privateTournamentId: number | null
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
  running: boolean
  coopCounter: number
  statistic: GameStatistic[]
  tradeDirection: number
  deckInfo: number[]
  colors: string[]
  created: number
  lastPlayed: number
  rematch_open: boolean
  substitutedPlayerIndices: number[]
  substitution: Substitution | null
  playernames: (string | null)[]
  teams: number[][]
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
