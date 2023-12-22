import { Socket } from 'socket.io'
import { sleep } from '../helpers/sleep.js'
import type { GameSocketC, GameSocketS } from '../sharedTypes/GameNamespaceDefinition.js'
import type { CustomSocket } from './socket.js'

type SupportedSockets = Socket | CustomSocket<any, any> | GameSocketC | GameSocketS
type SomeKindOfSocket = { socket: SupportedSockets } | SupportedSockets

export async function connectSocket(socket: SupportedSockets): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ;(socket as any).connect()
    ;(socket as any).once('connect', () => {
      resolve()
    })
    ;(socket as any).once('connect_error', () => {
      socket.disconnect()
      reject()
    })
  })
}

export function waitForEventOnSockets(sockets: SupportedSockets[], event: string) {
  return sockets.map((s) => {
    return new Promise<any>((resolve) => {
      ;(s as any).once(event as any, (data: any) => {
        resolve(data)
      })
    })
  })
}

export async function closeSockets(userWithSocketArray: SomeKindOfSocket[]): Promise<void> {
  for (const userWithSocket of userWithSocketArray) {
    await closeSocket(userWithSocket)
  }
  await sleep(1000) // TBD - Needed to add this to pass test consistently
}

async function closeSocket(someSocket: SomeKindOfSocket): Promise<void> {
  const socket: SupportedSockets = 'socket' in someSocket ? someSocket.socket : someSocket
  if (socket.disconnected) {
    return
  }
  await new Promise((resolve) => {
    ;(socket as any).once('disconnect', () => {
      ;(socket as any).removeAllListeners()
      resolve(null)
    })
    socket.disconnect()
  })
}
