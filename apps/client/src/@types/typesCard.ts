import type { PlayerCard as ServerPlayerCard } from 'tac-core/types/typesCard'

export interface PlayerCard extends ServerPlayerCard {
  key: string
  style: string
}
