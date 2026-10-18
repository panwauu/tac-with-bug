import type { MoveTextOrBall } from '../../types/ball'
import type { PlayerCard } from '../../types/card'

// Eigenes Modul ohne weitere Abhaengigkeiten: der KI-Worker braucht nur diese
// Funktion und soll die dynamisch geladenen Bots aus bots.ts nicht mitziehen.
export function getMovesFromCards(cards: PlayerCard[], gamePlayer: number): MoveTextOrBall[] {
  const moves: MoveTextOrBall[] = []

  for (const [cardIndex, card] of cards.entries()) {
    if (!card.possible) continue

    if (card.textAction !== '') {
      for (const action of card.textAction.split('+').filter((a) => a != null && a.length > 0)) {
        moves.push([gamePlayer, cardIndex, action])
      }
    }

    for (const ballIndex of Object.keys(card.ballActions)) {
      for (const action of card.ballActions[Number(ballIndex)]) {
        moves.push([gamePlayer, cardIndex, Number(ballIndex), action])
      }
    }
  }

  return moves
}
