import type { GeneralSocketC } from '@/services/socket'
import type { gamesSummary } from './useGamesSummary'
import { InjectionKey, inject } from 'vue'
import { friendsState } from './useFriends'

export const SocketKey: InjectionKey<GeneralSocketC> = Symbol('socket')
export const GamesSummaryKey: InjectionKey<gamesSummary> = Symbol('gamesSummary')
export const FriendsStateKey: InjectionKey<friendsState> = Symbol('friendsState')

export function injectStrict<T>(key: InjectionKey<T>, fallback?: T): T {
  const resolved = inject(key, fallback)
  if (!resolved) {
    throw new Error(`Could not resolve ${key.description}`)
  }
  return resolved
}
