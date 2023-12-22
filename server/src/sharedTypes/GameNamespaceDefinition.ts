import type { Socket as ServerSocket, Namespace } from 'socket.io'
import type { Socket as ClientSocket } from 'socket.io-client'
import type { MoveTextOrBall } from './typesBall.js'
import type { UpdateDataType } from './typesDBgame.js'
import type { CallbackFunction } from './GeneralNamespaceDefinition.js'

export interface ClientToServerEvents {
  postMove: (move: MoveTextOrBall) => void
  'substitution:offer': (playerIndexToSubstitute: number, cb: CallbackFunction<null>) => void
  'substitution:answer': (data: { accept: boolean }, cb: CallbackFunction<null>) => void
}

export interface ServerToClientEvents {
  reconnect_failed: (data: any) => void // Bugfix

  update: (data: UpdateDataType) => void
  'game:online-players': (data: { onlineGamePlayers: number[]; nWatchingPlayers: number; watchingPlayerNames: string[] }) => void

  'substitution:changeGamePlayer': (gamePlayer: number) => void

  'toast:substitution-offer': (username: string) => void
  'toast:substitution-done': (username: string, replacedUsername: string) => void
  'toast:substitution-stopped': () => void
}

interface SocketData {
  userID: number
  gameID: number
  gamePlayer: number
}

export type GameSocketS = ServerSocket<ClientToServerEvents, ServerToClientEvents, any, SocketData>
export type GameSocketC = ClientSocket<ServerToClientEvents, ClientToServerEvents>
export type GameNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData>
