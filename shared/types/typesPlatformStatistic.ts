export interface platformStats {
    weekDataset: weekDataset
    dayDataset: dayDataset
    hourDataset: hourDataset
    activityHeatmap: activityHeatmap
    localeDataset: localeDataset
    userAgentDataset: userAgentAnalysisData
}

export type hourDataset = number[][]
export type dayDataset = number[][]
export interface weekDataset {
    data: weekDatasetData
    passedRatio: number[]
}
export interface weekDatasetData { [key: string]: { [key: string]: number[] } }  // [users, games, active users]
export type activityHeatmap = number[][]
export type localeDataset = Array<{ locale: string; nUsers: number }>

export interface platformFunFacts {
    nGames4: number,
    nGames6: number,
    nGamesTeam: number,
    registeredUsers: number,
    fastestGame: number,
    longestGame: number,
    averagePlayingTime: number,
    nFriends: number,
    nTutorials: number,
    colors: string[],
    nColorBlind: number,
}

export interface userAgentAnalysisData {
    deviceTypes: Record<string, number>
    browserNames: Record<string, number>
    osNames: Record<string, number>
}