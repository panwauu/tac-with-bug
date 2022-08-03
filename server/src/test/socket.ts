import { Socket } from 'socket.io-client'
import type { EventsMap, EventNames } from '@socket.io/component-emitter'
import { ReservedOrUserEventNames } from 'socket.io/dist/typed-events'

type Head<T extends any[]> = T extends [...infer Head, any] ? Head : any[]
type Last<T extends any[]> = T extends [...any, infer Last] ? Last : any
type FirstParamType<T extends (...args: any[]) => void> = Parameters<T>[0]

type EventParams<_Map extends EventsMap, Ev extends keyof _Map> = Parameters<_Map[Ev]>

type EventsWithCallback<T> = {
  [P in keyof T]: T[P] extends (...args: infer A) => void // Check if it is a function
    ? Last<A> extends (arg: any) => any // Check if the last parameter is a function with single parameter
      ? ReturnType<Last<A>> extends void // Check if it returns void
        ? P // return the parameter name
        : never
      : never
    : never
}[keyof T]

type onceCallbackFirstArgument<Ev, E> = Ev extends EventNames<E> ? (E[Ev] extends (...args: any) => void ? Parameters<E[Ev]>[0] : never) : never

class CustomSocket<L, E> extends Socket<L, E> {
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
  oncePromise<Ev extends ReservedOrUserEventNames<{}, L>>(ev: Ev, timeout?: number): Promise<onceCallbackFirstArgument<Ev, L>> {
    return new Promise((resolve, reject) => {
      let timer: any
      if (timeout != null) {
        timer = setTimeout(() => {
          reject(new Error('timeout!'))
        }, timeout)
      }

      this.once(ev as any, (data: any) => {
        clearTimeout(timer)
        resolve(data)
      })
    })
  }
}

// @ts-ignore
Socket.prototype.emitWithAck = CustomSocket.prototype.emitWithAck
// @ts-ignore
Socket.prototype.oncePromise = CustomSocket.prototype.oncePromise

import type { ServerToClientEvents, ClientToServerEvents } from '../sharedTypes/GeneralNamespaceDefinition'
export type GeneralSocketC = CustomSocket<ServerToClientEvents, ClientToServerEvents>
import type { ServerToClientEvents as StCEventsGame, ClientToServerEvents as CtSEventsGame } from '../sharedTypes/GameNamespaceDefinition'
export type GameSocketC = CustomSocket<StCEventsGame, CtSEventsGame>
