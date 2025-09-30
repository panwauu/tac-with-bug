import type { HofReason } from './typesHof'

export interface PlayerFrontendStatistic {
  /**
   * All games of a player from oldest to newest
   * 'w' = won, 'l' = lost, 'c' = coop, 'a' = aborted, 'r' = running
   */
  history: ('w' | 'l' | 'c' | 'a' | 'r')[]
  table: number[]
  gamesDistribution: GamesDistributionData
  subscriber: boolean
  people: { [key: string]: number[] }
  hof: HofReason[]
  userDescription: string
  registered: string
  blockedByModerationUntil: string | null
  streaks: {
    longestWinningStreak: number
    longestLosingStreak: number
    currentStreak: number
  }
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
