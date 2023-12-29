// Hi, I'm greedy,
// I care about nothing but about getting balls into the house

import { AiData } from '../simulation/output'
import { AiInterface, getMovesFromCards } from '../simulation/simulation'

export class Greedy implements AiInterface {
  choose(data: AiData) {
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)

    return moves.sort((m1, m2) => m2.length - m1.length).sort((m1, m2) => (m2[3] ?? 0) - (m1[3] ?? 0))[0]
  }
}
