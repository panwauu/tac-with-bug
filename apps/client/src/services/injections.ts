import type { GameSocketC, GeneralSocketC } from '@/services/socket'
import type { RunningGamesOfUser } from './useRunningGamesOfUser'
import { type InjectionKey, inject } from 'vue'
import type { FriendsState } from './useFriends'

export const SocketKey: InjectionKey<GeneralSocketC> = Symbol('socket')
export const GameSocketKey: InjectionKey<GameSocketC> = Symbol('gameSocket')
export const RunningGamesOfUserKey: InjectionKey<RunningGamesOfUser> = Symbol('runningGamesOfUser')
export const FriendsStateKey: InjectionKey<FriendsState> = Symbol('friendsState')

export function injectStrict<T>(key: InjectionKey<T>, fallback?: T): T {
  const resolved = inject(key, fallback)
  if (!resolved) {
    throw new Error(`Could not resolve ${key.description}`)
  }
  return resolved
}
