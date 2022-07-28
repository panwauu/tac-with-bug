import type { Socket as ServerSocket, Namespace } from 'socket.io'
import type { Socket as ClientSocket } from 'socket.io-client'
import type { MoveTextOrBall } from './typesBall'
import type { UpdateDataType } from './typesDBgame'
import type { CallbackFunction } from './GeneralNamespaceDefinition'

export interface ClientToServerEvents {
  postMove: (move: MoveTextOrBall) => void
  'replacement:offer': (cb: CallbackFunction<null>) => void
  'replacement:answer': (data: { accept: boolean }, cb: CallbackFunction<null>) => void
}

export interface ServerToClientEvents {
  reconnect_failed: (data: any) => void // Bugfix

  update: (data: UpdateDataType) => void
  'game:online-players': (data: { onlineGamePlayers: number[]; nWatchingPlayers: number; watchingPlayerNames: string[] }) => void

  'replacement:changeGamePlayer': (gamePlayer: number) => void

  'toast:replacement-offer': (username: string) => void
  'toast:replacement-done': (username: string, replacedUsername: string) => void
  'toast:replacement-stopped': () => void
}

interface SocketData {
  userID: number
  gameID: number
  gamePlayer: number
}

export type GameSocketS = ServerSocket<ClientToServerEvents, ServerToClientEvents, any, SocketData>
export type GameSocketC = ClientSocket<ServerToClientEvents, ClientToServerEvents>
export type GameNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData>
