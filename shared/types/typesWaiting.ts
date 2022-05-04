export interface waitingGame {
    id: number,
    gameid: number | null,
    nPlayers: number,
    nTeams: number,
    meister: boolean,
    private: boolean,
    admin: string,
    adminID: number,
    players: string[],
    playerIDs: number[],
    balls: string[],
    ready: boolean[],
}

export type createGameType = {
    nPlayers: number,
    nTeams: number,
    meister: boolean,
    private: boolean,
}

export type movePlayerType = { gameID: number, username: string, steps: number }

export type switchColorType = {
    gameID: number,
    username: string,
    color: string,
}

export type startGameType = {
    gameID: number,
    nPlayers: number,
    gamePlayer: number,
}