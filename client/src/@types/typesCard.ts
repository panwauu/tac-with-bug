import { PlayerCard as ServerPlayerCard } from '@/../../server/src/sharedTypes/typesCard'

export interface PlayerCard extends ServerPlayerCard {
  key: string
  style: string
}
