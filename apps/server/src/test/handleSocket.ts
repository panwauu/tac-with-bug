import { Socket } from 'socket.io'
import { sleep } from '../helpers/sleep'
import type { GameSocketC, GameSocketS } from '../sharedTypes/GameNamespaceDefinition'
import type { CustomSocket } from './socket'

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

const DEFAULT_EVENT_TIMEOUT = 5000

/** Register the listeners before triggering the action that leads to the event - an event that was
 * emitted before cannot be caught afterwards and would run into the timeout */
export function waitForEventOnSockets(sockets: SupportedSockets[], event: string, timeout: number = DEFAULT_EVENT_TIMEOUT) {
  return sockets.map((s) => waitForEvent(s, event, () => true, timeout))
}

/** Waits for the first payload that fulfills the condition - for events that are emitted several
 * times while the server settles, e.g. once per socket that leaves the game */
export function waitForMatchingEventOnSockets(sockets: SupportedSockets[], event: string, condition: (data: any) => boolean, timeout: number = DEFAULT_EVENT_TIMEOUT) {
  return sockets.map((s) => waitForEvent(s, event, condition, timeout))
}

function waitForEvent(socket: SupportedSockets, event: string, condition: (data: any) => boolean, timeout: number): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const listener = (data: any) => {
      if (!condition(data)) return
      clearTimeout(timer)
      ;(socket as any).off(event as any, listener)
      resolve(data)
    }

    const timer = setTimeout(() => {
      ;(socket as any).off(event as any, listener)
      reject(new Error(`Timeout of ${timeout}ms while waiting for the event '${event}'`))
    }, timeout)
    ;(socket as any).on(event as any, listener)
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
