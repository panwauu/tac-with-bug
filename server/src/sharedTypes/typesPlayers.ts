export interface player {
  name: string
  remainingCards: number
  active: boolean
  playerNumber: number
  team: number
  narrFlag: [boolean, boolean]
  tradeInformation?: [boolean, boolean]
  discarded: boolean
}
