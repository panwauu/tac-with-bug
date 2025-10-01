export interface GameStatistic {
  cards: GameStatisticCardsType
  actions: GameStatisticActionsType
}

/** Total played / actually used / traded to Partner */
export interface GameStatisticCardsType {
  total: number[] // [number, number, number] removed because of tsoa
  '7': number[] // [number, number, number] removed because of tsoa
  '13': number[] // [number, number, number] removed because of tsoa
  '1': number[] // [number, number, number] removed because of tsoa
  '8': number[] // [number, number, number] removed because of tsoa
  trickser: number[] // [number, number, number] removed because of tsoa
  tac: number[] // [number, number, number] removed because of tsoa
  engel: number[] // [number, number, number] removed because of tsoa
  teufel: number[] // [number, number, number] removed because of tsoa
  krieger: number[] // [number, number, number] removed because of tsoa
  narr: number[] // [number, number, number] removed because of tsoa
  '4': number[] // [number, number, number] removed because of tsoa
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
