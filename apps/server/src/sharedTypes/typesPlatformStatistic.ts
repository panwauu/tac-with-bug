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
