export interface BallType {
  player: number
  position: number
  state: 'house' | 'valid' | 'invalid' | 'goal' | 'locked'
}

export type BallsType = Array<BallType>

export type MoveType = MoveDeal | MoveText | MoveBall
export type MoveTextOrBall = MoveText | MoveBall

export type MoveDeal = 'dealCards'
export type MoveText = [number, number, string]
export type MoveBall = [number, number, number, number]

// Card in CardsWithMoves
export interface BallActions {
  [key: number]: number[]
}
