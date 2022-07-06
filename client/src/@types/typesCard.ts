import { playerCard as ServerPlayerCard } from '@/../../server/src/sharedTypes/typesCard'

export interface playerCard extends ServerPlayerCard {
  key: string
  style: string
}
