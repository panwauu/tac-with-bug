import { Game } from '../game/game'
import type { PlayerCard } from '../types/card'
import { testCapturedMoves } from '../test/captureCompare'

test('Test constructor throws - 4', () => {
  expect(() => {
    new Game(4, 2, true, true)
  }).not.toThrow()
  expect(() => {
    new Game(4, 2, true, false)
  }).not.toThrow()
  expect(() => {
    new Game(5, 2, true, true)
  }).toThrow()
  expect(() => {
    new Game(3, 2, true, true)
  }).toThrow()
  expect(() => {
    new Game(4, 0, true, true)
  }).toThrow()
  expect(() => {
    new Game(4, 3, true, true)
  }).toThrow()
  expect(() => {
    new Game(4, 1, true, true)
  }).toThrow()
})

test('Test constructor throws - 6', () => {
  expect(() => {
    new Game(6, 2, true, false)
  }).not.toThrow()
  expect(() => {
    new Game(6, 3, true, false)
  }).not.toThrow()
  expect(() => {
    new Game(6, 3, true, true)
  }).not.toThrow()
  expect(() => {
    new Game(6, 0, true, true)
  }).toThrow()
  expect(() => {
    new Game(6, 1, true, true)
  }).toThrow()
  expect(() => {
    new Game(6, 2, true, true)
  }).toThrow()
})

test('Test load Game', () => {
  const result = testCapturedMoves('4469prod')
  expect(result.equal).toBe(true)

  const json = result.game?.getJSON() ?? ''
  const gameInst = new Game(0, 0, true, true, JSON.parse(json))
  expect(result.game).toEqual(gameInst)
})

function gameWithCardsWithMoves(cardsWithMoves: PlayerCard[]): Game {
  const game = new Game(4, 2, true, false)
  game.tradeFlag = false
  game.activePlayer = 0
  game.cardsWithMoves = cardsWithMoves
  return game
}

test('checkMove - textAction has to match exactly', () => {
  const game = gameWithCardsWithMoves([{ title: '8', possible: true, ballActions: {}, textAction: 'aussetzen' }])

  expect(game.checkMove([0, 0, 'aussetzen'])).toBe(true)
  // Substrings of an allowed textAction are not allowed moves
  expect(game.checkMove([0, 0, 'setzen'])).toBe(false)
  expect(game.checkMove([0, 0, 'aussetze'])).toBe(false)
  expect(game.checkMove([0, 0, 'abwerfen'])).toBe(false)
})

test('checkMove - textAction with multiple actions', () => {
  const game = gameWithCardsWithMoves([{ title: '8', possible: true, ballActions: {}, textAction: 'aussetzen+abwerfen' }])

  expect(game.checkMove([0, 0, 'aussetzen'])).toBe(true)
  expect(game.checkMove([0, 0, 'abwerfen'])).toBe(true)
  expect(game.checkMove([0, 0, 'aussetzen+abwerfen'])).toBe(false)
  expect(game.checkMove([0, 0, '+'])).toBe(false)
})

test('checkMove - empty textAction is never allowed', () => {
  for (const textAction of ['', 'abwerfen', '+abwerfen', 'aussetzen+abwerfen']) {
    const game = gameWithCardsWithMoves([{ title: '8', possible: true, ballActions: {}, textAction }])
    expect(game.checkMove([0, 0, ''])).toBe(false)
  }
})

test('checkMove - player and card number have to be in range', () => {
  const game = gameWithCardsWithMoves([{ title: '8', possible: true, ballActions: { 0: [1] }, textAction: 'aussetzen' }])

  expect(game.checkMove([-1, 0, 'aussetzen'])).toBe(false)
  expect(game.checkMove([4, 0, 'aussetzen'])).toBe(false)
  expect(game.checkMove([0, -1, 'aussetzen'])).toBe(false)
  expect(game.checkMove([0, 1, 'aussetzen'])).toBe(false)
  expect(game.checkMove([0, 0.5, 'aussetzen'])).toBe(false)
  expect(game.checkMove([0, 0, 0, 1])).toBe(true)
  expect(game.checkMove([0, 0, 0.5, 1])).toBe(false)
  expect(game.checkMove([0, 0, 0, 1.5])).toBe(false)
})

test('checkMove - narr move of player out of range', () => {
  const game = gameWithCardsWithMoves([{ title: 'narr', possible: true, ballActions: {}, textAction: 'narr' }])
  game.narrFlag = [true, false, false, false]

  expect(game.checkMove([1, 0, 'narr'])).toBe(true)
  expect(game.checkMove([0, 0, 'narr'])).toBe(false)
  expect(game.checkMove([4, 0, 'narr'])).toBe(false)
  expect(game.checkMove([-1, 0, 'narr'])).toBe(false)
})

test('checkMove - tauschen move of player out of range', () => {
  const game = gameWithCardsWithMoves([])
  game.tradeFlag = true

  expect(game.checkMove([1, 0, 'tauschen'])).toBe(true)
  expect(game.checkMove([4, 0, 'tauschen'])).toBe(false)
  expect(game.checkMove([1, 0.5, 'tauschen'])).toBe(false)
  expect(game.checkMove([1, 0, ''])).toBe(false)
})
