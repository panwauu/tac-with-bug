import type { Socket as ServerSocket, Namespace } from 'socket.io'
import type { Socket as ClientSocket } from 'socket.io-client'
import type { MoveTextOrBall } from './typesBall'
import type { UpdateDataType } from './typesDBgame'

export interface ClientToServerEvents {
  postMove: (move: MoveTextOrBall) => void
}

export interface ServerToClientEvents {
  reconnect_failed: (data: any) => void // Bugfix

  update: (data: UpdateDataType) => void
  'game:online-players': (data: { onlineGamePlayers: number[]; nWatchingPlayers: number; watchingPlayerNames: string[] }) => void
}

interface SocketData {
  userID: number
  gameID: number
  gamePlayer: number
}

export type GameSocketS = ServerSocket<ClientToServerEvents, ServerToClientEvents, any, SocketData>
export type GameSocketC = ClientSocket<ServerToClientEvents, ClientToServerEvents>
export type GameNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData>
