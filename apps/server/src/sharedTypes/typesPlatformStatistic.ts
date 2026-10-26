export interface PlatformStats {
  weekDataset: WeekDatasetType
  dayDataset: DayDatasetType
  hourDataset: HourDatasetType
  activityHeatmap: ActivityHeatmap
  localeDataset: LocaleDataset
  userAgentDataset: UserAgentAnalysisData
}

export type HourDatasetType = number[][]
export type DayDatasetType = number[][]
export interface WeekDatasetType {
  data: WeekDatasetDataType
  passedRatio: number[]
}
export interface WeekDatasetDataType {
  [key: string]: { [key: string]: number[] }
} // [users, games, active users]
export type ActivityHeatmap = number[][]
export type LocaleDataset = Array<{ locale: string; nUsers: number }>

export interface PlatformFunFacts {
  nGames4: number
  nGames6: number
  nGamesTeam: number
  registeredUsers: number
  fastestGame: number
  longestGame: number
  averagePlayingTime: number
  bestTeamGame: number
  worstTeamGame: number
  averageTeamGame: number
  nFriends: number
  nTutorials: number
  colors: string[]
  nColorBlind: number
}

export interface UserAgentAnalysisData {
  deviceTypes: Record<string, number>
  browserNames: Record<string, number>
  osNames: Record<string, number>
}

/**
 * One bot of Tac-With-Bug (botID) or one account of an external bot that logs in like a user (username),
 * counted over the finished games. Bots also play against bots, so their strength is only measured in
 * the games where all opponents are humans.
 */
export interface BotStatistic {
  botID: number | null
  username: string | null
  games: number
  gamesLast30Days: number
  humans: number
  againstHumans: { games: number; wins: number }
  coop: { games: number; averageCards: number | null }
  // Games against the AI in the browser (only levels of the AI): wins of the AI against the human, cards in coop
  browser: { games: number; wins: number; averageCards: number | null }
}
