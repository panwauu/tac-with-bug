import { Game } from '../../game/game'
import { getAiData } from '../simulation/output'
import { tradeBot } from './TradeBot'

describe('TradeBot', () => {
  test('Should trade card that can move into house', () => {
    const game = new Game(4, 2, true, false)
    game.balls[8].position = 47
    game.balls[8].state = 'valid'
    game.cards.players[0] = ['1', '2']
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade card that can move into house but prefer a "low value" card', () => {
    const game = new Game(4, 2, true, false)
    game.balls[8].position = 48
    game.balls[8].state = 'valid'
    game.cards.players[0] = ['1', '2', '7']
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade card that can move into house but prefer a card with "low value" to move to end', () => {
    const game = new Game(4, 2, true, false)
    game.balls[8].position = 47
    game.balls[8].state = 'valid'
    game.cards.players[0] = ['7', '2', '3', '5']
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(3)
  })

  test('Should trade 7 if it can move into house', () => {
    const game = new Game(4, 2, true, false)
    game.balls[7].position = 48
    game.balls[7].state = 'valid'
    game.balls[8].position = 47
    game.balls[8].state = 'valid'
    game.cards.players[0] = ['1', '7']
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade card that can move into house if others move their balls', () => {
    const game = new Game(4, 2, true, false)
    game.balls[7].position = 48
    game.balls[7].state = 'valid'
    game.balls[8].position = 47
    game.balls[8].state = 'valid'
    game.cards.players[0] = ['1', '2']
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade card that can move into house if others move their balls but prefer low value cards', () => {
    const game = new Game(4, 2, true, false)
    game.balls[7].position = 48
    game.balls[7].state = 'valid'
    game.balls[8].position = 38
    game.balls[8].state = 'valid'
    game.cards.players[0] = ['13', '12']
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade 1/13 if more than two', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['13', '13', '2', '3', '3']
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect([0, 1]).toContain(move?.[1])
  })

  test('Should trade 1/13 if more than two', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[2] = ['2', '2', '2', '2', '2']
    game.cards.players[0] = ['13', '13', '2', '3', '3']
    game.cards.hadOneOrThirteen[2] = false
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect([0, 1]).toContain(move?.[1])
  })

  test('Should trade 1/13 if more balls outside', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[2] = ['2', '2', '2', '2', '2']
    game.cards.players[0] = ['2', '13', '2', '3', '3']
    game.cards.hadOneOrThirteen[2] = false
    game.balls[0].position = 38
    game.balls[0].state = 'valid'
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade 1/13 if same number of balls outside but more in proximity', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[2] = ['2', '2', '2', '2', '2']
    game.cards.players[0] = ['12', '13', '12', '12', '12']
    game.cards.hadOneOrThirteen[2] = false
    game.balls[0].position = 38
    game.balls[0].state = 'valid'
    game.balls[8].position = 47
    game.balls[8].state = 'valid'
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade card to kill enemy in proximity', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['9', '10', '12', '13', '8']
    game.balls[8].position = 55
    game.balls[8].state = 'valid'
    game.balls[12].position = 63
    game.balls[12].state = 'valid'
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(4)
  })

  test('Should trade card to clean up house', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['2', '3', '12', '10']
    game.balls[8].position = 88
    game.balls[8].state = 'goal'
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test.todo('Should not trade card to clean up house if it is needed to move own ball into house', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['2', '9', '12', '10']
    game.balls[8].position = 88
    game.balls[8].state = 'goal'
    game.balls[0].position = 16
    game.balls[0].state = 'valid'
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).not.toBe(0)
  })

  test.todo('Should not trade card that could help partner move into goal in the future if it is needed to own move ball into house', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['2', '9', '12', '10']
    game.balls[8].position = 63
    game.balls[8].state = 'goal'
    game.balls[4].position = 64
    game.balls[4].state = 'valid'
    game.balls[0].position = 16
    game.balls[0].state = 'valid'
    game.updateCardsWithMoves()

    const move = tradeBot(getAiData(game, 0))
    expect(move?.[1]).not.toBe(0)
  })
})
