import { CardType } from '../../types/typesCard'
import { MoveTextOrBall } from '../../types/typesBall'
import { AiData } from '../simulation/output'
import { getMovesFromCards } from '../simulation/simulation'

// Most valuable first, if not in array then it is discarded first
const orderedMostValuableCards = ['tac', 'trickser', 'teufel', '1', '13', '4', '7']

export function getDiscardScore(card: CardType): number {
  const index = orderedMostValuableCards.indexOf(card)
  return index === -1 ? orderedMostValuableCards.length : index
}

export function discardBot(data: AiData): MoveTextOrBall | null {
  const moves = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
  if (moves.some((m) => m[2] !== 'abwerfen' || m.length === 4)) {
    return null
  }

  return moves.toSorted((a, b) => getDiscardScore(data.cardsWithMoves[b[1]].title) - getDiscardScore(data.cardsWithMoves[a[1]].title))[0]
}
