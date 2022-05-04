import type { Socket as ServerSocket, Namespace } from 'socket.io';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { moveTextOrBall } from './typesBall';
import type { updateDataType } from './typesDBgame';

export interface ClientToServerEvents {
    'postMove': (move: moveTextOrBall) => void,
}

export interface ServerToClientEvents {
    'reconnect_failed': (data: any) => void, // Bugfix

    'update': (data: updateDataType) => void,
    'game:online-players': (data: { onlineGamePlayers: number[], nWatchingPlayers: number, watchingPlayerNames: string[] }) => void,
}

interface socketData {
    userID: number,
    gameID: number,
    gamePlayer: number,
}

export type GameSocketS = ServerSocket<ClientToServerEvents, ServerToClientEvents, any, socketData>
export type GameSocketC = ClientSocket<ServerToClientEvents, ClientToServerEvents>
export type GameNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, any, socketData>