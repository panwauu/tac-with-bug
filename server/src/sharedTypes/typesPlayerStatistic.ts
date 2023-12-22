import type { HofReason } from './typesHof.js'

export interface PlayerFrontendStatistic {
  history: ('won' | 'lost' | 'coop' | 'aborted' | 'running')[]
  players: {
    mostFrequent: string
    bestPartner: string
    worstEnemy: string
  }
  table: number[]
  gamesDistribution: GamesDistributionData
  subscriber: boolean
  people: { [key: string]: number[] }
  hof: HofReason[]
  userDescription: string
  registered: string
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
