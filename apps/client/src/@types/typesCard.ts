import type { PlayerCard as ServerPlayerCard } from '@repo/core/types'

export interface PlayerCard extends ServerPlayerCard {
  key: string
  style: string
}
