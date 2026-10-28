export interface Player {
  name: string
  remainingCards: number
  active: boolean
  playerNumber: number
  team: number
  narrFlag: [boolean, boolean]
  tradeInformation?: [boolean, boolean]
  discarded: boolean
  bot: boolean
  // The bot that actually plays on this seat (see spielenderBot), null for humans
  botID: number | null
}
