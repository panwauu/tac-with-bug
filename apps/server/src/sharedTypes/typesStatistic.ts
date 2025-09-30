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
  lastGamesHistory: ('won' | 'lost' | 'coop' | 'aborted' | 'running')[]
  people: PeopleOjectType
  coopBest4: number
  coopBest6: number
  longestWinningStreak: number
  currentWinningStreak: number
  longestLosingStreak: number
  currentLosingStreak: number
}

export interface PeopleOjectType {
  // playedTogether - Won together - playedAgainst - won against
  [key: string]: number[] // removed because of tsoa [number, number, number, number, number]
}

export interface GameStatistic {
  cards: GameStatisticCardsType
  actions: GameStatisticActionsType
}

export interface GameStatisticCardsType {
  // Total played / actually used / traded to Partner
  total: [number, number, number]
  '7': [number, number, number]
  '13': [number, number, number]
  '1': [number, number, number]
  '8': [number, number, number]
  trickser: [number, number, number]
  tac: [number, number, number]
  engel: [number, number, number]
  teufel: [number, number, number]
  krieger: [number, number, number]
  narr: [number, number, number]
  '4': [number, number, number]
}

export interface GameStatisticActionsType {
  nBallsLost: number
  nBallsKickedEnemy: number
  nBallsKickedOwnTeam: number
  nBallsKickedSelf: number
  nMoves: number
  timePlayed: number
  nAbgeworfen: number
  nAussetzen: number
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
