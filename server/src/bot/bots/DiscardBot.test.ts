import { AiData } from '../simulation/output'
import { discardBot } from './DiscardBot'

describe('DiscardBot', () => {
  test('Should not discard tac', () => {
    const data = {
      cardsWithMoves: [
        { title: 'tac', possible: true, ballActions: {}, textAction: 'abwerfen' },
        { title: 'trickser', possible: true, ballActions: {}, textAction: 'abwerfen' },
      ],
      gamePlayer: 0,
    }
    const move = discardBot(data as AiData)
    expect(move?.[1]).toBe(1)
  })

  test('Should not discard tac', () => {
    const data = {
      cardsWithMoves: [
        { title: '8', possible: true, ballActions: {}, textAction: 'abwerfen' },
        { title: 'trickser', possible: true, ballActions: {}, textAction: 'abwerfen' },
      ],
      gamePlayer: 0,
    }
    const move = discardBot(data as AiData)
    expect(move?.[1]).toBe(0)
  })

  test('Should not discard 7', () => {
    const data = {
      cardsWithMoves: [
        { title: '8', possible: true, ballActions: {}, textAction: 'abwerfen' },
        { title: '7', possible: true, ballActions: {}, textAction: 'abwerfen' },
      ],
      gamePlayer: 0,
    }
    const move = discardBot(data as AiData)
    expect(move?.[1]).toBe(0)
  })
})
