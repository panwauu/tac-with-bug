// Hi, I'm raindom
// I can do a lot of things, like:
// - Just playing randomly

import { AiData, AiInterface, getMovesFromCards } from '../simulation/simulation'

export class Raindom implements AiInterface {
  choose(data: AiData) {
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)

    return moves[Math.floor(Math.random() * moves.length)]
  }
}
