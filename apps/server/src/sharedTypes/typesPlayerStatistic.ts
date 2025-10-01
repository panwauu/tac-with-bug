import type { GameStatisticActionsType } from '@repo/core/types'
import type { HofReason } from './typesHof'

/** Copied for tsoa - Total played / actually used / traded to Partner */
export interface GameStatisticCardsType {
  total: number[] // [number, number, number] removed because of tsoa
  '7': number[] // [number, number, number] removed because of tsoa
  '13': number[] // [number, number, number] removed because of tsoa
  '1': number[] // [number, number, number] removed because of tsoa
  '8': number[] // [number, number, number] removed because of tsoa
  trickser: number[] // [number, number, number] removed because of tsoa
  tac: number[] // [number, number, number] removed because of tsoa
  engel: number[] // [number, number, number] removed because of tsoa
  teufel: number[] // [number, number, number] removed because of tsoa
  krieger: number[] // [number, number, number] removed because of tsoa
  narr: number[] // [number, number, number] removed because of tsoa
  '4': number[] // [number, number, number] removed because of tsoa
}

export interface PlayerFrontendStatistic {
  /**
   * All games of a player from oldest to newest
   * 'w' = won, 'l' = lost, 'c' = coop, 'a' = aborted, 'r' = running
   */
  history: ('w' | 'l' | 'c' | 'a' | 'r')[]
  table: number[]
  gamesDistribution: GamesDistributionData
  subscriber: boolean
  people: PeopleOjectType
  hof: HofReason[]
  userDescription: string
  registered: string
  blockedByModerationUntil: string | null
  bestCoop: number
  worstCoop: number
  ballsInOwnTeam: number
  ballsInEnemy: number
  nBallsLost: number
  nBallsKickedEnemy: number
  nBallsKickedOwnTeam: number
  nBallsKickedSelf: number
  nMoves: number
  timePlayed: number
  nAbgeworfen: number
  nAussetzen: number
  cards: GameStatisticCardsType
}

export interface GamesDistributionData {
  teamWon: number
  teamAborted: number
  won4: number
  lost4: number
  won6: number
  lost6: number
  aborted: number
  running: number
}

export interface PlayerStatistic {
  cards: GameStatisticCardsType
  actions: GameStatisticActionsType
  wl: PlayerWLStatistic
}

export interface PlayerWLStatistic {
  nGamesWon4: number
  nGamesWon6: number
  nGamesLost4: number
  nGamesLost6: number
  nGamesCoopWon: number
  nGamesCoopAborted: number
  nGamesAborted: number
  nGamesRunning: number
  ballsInOwnTeam: number
  ballsInEnemy: number
  gamesHistory: ('w' | 'l' | 'c' | 'a' | 'r')[]
  people: PeopleOjectType
  coopBest4: number
  coopBest6: number
}

export interface UserNetworkEdge {
  data: {
    source: string
    target: string
    weight: number
    together: boolean
    id: string
  }
}

export interface UserNetworkNode {
  data: {
    id: string
    idInt: number
    name: string
    score: number
  }
}

export interface UserNetwork {
  edges: UserNetworkEdge[]
  nodes: UserNetworkNode[]
}

export interface UserNetworkApiResponse {
  graph: UserNetwork
}

/**
 * Object with a key for every player containing an Array with the relational stats of the players:
 * - 0: Games played in one team (excluding coop)
 * - 1: Games won as a team (excluding coop)
 * - 2: Games played in different teams (excluding coop)
 * - 3: Games won against each other (excluding coop)
 * - 4: Games played together in total (together, against and coop)
 */
export interface PeopleOjectType {
  [key: string]: PlayerRelationType
}

/**
 * Array with the relational stats of the players:
 * - 0: Games played in one team (excluding coop)
 * - 1: Games won as a team (excluding coop)
 * - 2: Games played in different teams (excluding coop)
 * - 3: Games won against each other (excluding coop)
 * - 4: Games played together in total (together, against and coop)
 */
export type PlayerRelationType = number[] // removed because of tsoa [number, number, number, number, number]

export interface PlayerStatistic {
  cards: GameStatisticCardsType
  actions: GameStatisticActionsType
  wl: PlayerWLStatistic
}

export interface PlayerWLStatistic {
  nGamesWon4: number
  nGamesWon6: number
  nGamesLost4: number
  nGamesLost6: number
  nGamesCoopWon: number
  nGamesCoopAborted: number
  nGamesAborted: number
  nGamesRunning: number
  ballsInOwnTeam: number
  ballsInEnemy: number
  gamesHistory: ('w' | 'l' | 'c' | 'a' | 'r')[]
  people: PeopleOjectType
  coopBest4: number
  coopBest6: number
  coopWorst4: number
  coopWorst6: number
}
