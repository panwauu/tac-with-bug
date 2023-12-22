import { io } from 'socket.io-client'
import type { GameSocketC } from '../test/socket'
import { connectSocket } from './handleSocket'

export function initiateGameSocket(gameID: number | string, token: string): GameSocketC {
  const port = (global as any).testServer.httpServer.address().port
  return io(`http://localhost:${port}/game`, { auth: { gameID: gameID, token: token }, forceNew: true, autoConnect: false }) as any
}

export async function registerGameSocket(gameID: number | string, token: string): Promise<GameSocketC> {
  const gameSocket: GameSocketC = initiateGameSocket(gameID, token)
  await connectSocket(gameSocket)
  return gameSocket
}
