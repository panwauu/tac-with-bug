import { Socket } from 'socket.io-client'
import type { EventsMap, EventNames } from '@socket.io/component-emitter'

type Head<T extends any[]> = T extends [...infer Head, any] ? Head : any[] // eslint-disable-line
type Last<T extends any[]> = T extends [...any, infer Last] ? Last : any // eslint-disable-line
type FirstParamType<T extends (...args: any[]) => void> = Parameters<T>[0]

type EventParams<_Map extends EventsMap, Ev extends keyof _Map> = Parameters<_Map[Ev]>

type EventsWithCallback<T> = {
  [P in keyof T]: T[P] extends (...args: infer A) => void // Check if it is a function
    ? Last<A> extends (arg: any) => any // Check if the last parameter is a function with single parameter
      ? ReturnType<Last<A>> extends void // eslint-disable-line
        ? P // return the parameter name
        : never
      : never
    : never
}[keyof T]

class CustomSocket<L extends EventsMap, E extends EventsMap> extends Socket<L, E> {
  // @ts-ignore
  emitWithAck<Ev extends EventsWithCallback<E>>(timeout: number, ev: Ev, ...args: Head<EventParams<E, Ev>>): Promise<FirstParamType<Last<EventParams<E, Ev>>>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('timeout!'))
      }, timeout)

      args.push((res: FirstParamType<Last<EventParams<E, Ev>>>) => {
        clearTimeout(timer)
        resolve(res)
      })

      this.emit(ev as EventNames<E>, ...(args as any))
    })
  }
}

// @ts-ignore
Socket.prototype.emitWithAck = CustomSocket.prototype.emitWithAck

import type { ServerToClientEvents, ClientToServerEvents } from '@/../../server/src/sharedTypes/GeneralNamespaceDefinition'
export type GeneralSocketC = CustomSocket<ServerToClientEvents, ClientToServerEvents>
import type { ServerToClientEvents as StCEventsGame, ClientToServerEvents as CtSEventsGame } from '@/../../server/src/sharedTypes/GameNamespaceDefinition'
export type GameSocketC = CustomSocket<StCEventsGame, CtSEventsGame>
