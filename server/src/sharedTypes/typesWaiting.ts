export interface WaitingGame {
  id: number
  gameid: number | null
  nPlayers: number
  nTeams: number
  meister: boolean
  private: boolean
  admin: string
  adminID: number
  players: string[]
  playerIDs: number[]
  balls: string[]
  ready: boolean[]
}

export type CreateGameType = {
  nPlayers: number
  nTeams: number
  meister: boolean
  private: boolean
}

export type MovePlayerType = { gameID: number; username: string; steps: number }

export type SwitchColorType = {
  gameID: number
  username: string
  color: string
}

export type StartGameType = {
  gameID: number
  nPlayers: number
  gamePlayer: number
}
