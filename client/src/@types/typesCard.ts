import { playerCard as ServerPlayerCard } from '@/../../shared/types/typesCard'

export interface playerCard extends ServerPlayerCard {
  key: string
  style: string
}
