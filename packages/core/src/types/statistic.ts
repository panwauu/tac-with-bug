export interface GameStatistic {
  cards: GameStatisticCardsType
  actions: GameStatisticActionsType
}

export interface GameStatisticCardsType {
  // Total played / actually used / traded to Partner
  total: [number, number, number]
  '7': [number, number, number]
  '13': [number, number, number]
  '1': [number, number, number]
  '8': [number, number, number]
  trickser: [number, number, number]
  tac: [number, number, number]
  engel: [number, number, number]
  teufel: [number, number, number]
  krieger: [number, number, number]
  narr: [number, number, number]
  '4': [number, number, number]
}

export interface GameStatisticActionsType {
  nBallsLost: number
  nBallsKickedEnemy: number
  nBallsKickedOwnTeam: number
  nBallsKickedSelf: number
  nMoves: number
  timePlayed: number
  nAbgeworfen: number
  nAussetzen: number
}
