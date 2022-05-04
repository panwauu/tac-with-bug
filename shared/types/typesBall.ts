export interface ballType {
    player: number,
    position: number,
    state: 'house' | 'valid' | 'invalid' | 'goal' | 'locked',
}

export type ballsType = Array<ballType>


export type moveType = moveDeal | moveText | moveBall;
export type moveTextOrBall = moveText | moveBall;

export type moveDeal = 'dealCards'
export type moveText = [number, number, string]
export type moveBall = [number, number, number, number]

// Card in CardsWithMoves
export interface ballActions {
    [key: number]: number[];
}