// Hi, I'm raindom
// I can do a lot of things, like:
// - Just playing randomly

import { AiData, AiInterface, getMovesFromCards } from '../simulation/dev'

export class Raindom implements AiInterface {
  choose(data: AiData) {
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
    if (data.cardsWithMoves.length !== 0 && data.narrFlag.some((f) => f) && !data.narrFlag[data.gamePlayer]) moves.push([data.gamePlayer, 0, 'narr'])

    return moves[Math.floor(Math.random() * moves.length)]
  }
}
