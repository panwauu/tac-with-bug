// Hi, I'm greedy,
// I care about nothing but about getting balls into the house

import { AiData, AiInterface, getMovesFromCards } from '../simulation/dev'

export class Greedy implements AiInterface {
  choose(data: AiData) {
    const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
    if (data.cardsWithMoves.length !== 0 && data.narrFlag.some((f) => f) && !data.narrFlag[data.gamePlayer]) moves.push([data.gamePlayer, 0, 'narr'])

    return moves.sort((m1, m2) => m2.length - m1.length).sort((m1, m2) => (m2[3] ?? 0) - (m1[3] ?? 0))[0]
  }
}