describe.todo('test Futuro bot', () => {})

/*import { Game } from '../../game/game'
import { getAiData } from '../simulation/output'
import { Futuro } from './Futuro'

describe.todo('test Futuro bot', () => {
  test('Should not split 7 if there is only one ball', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 0
    game.tradeFlag = false
    game.tradedCards = ['1', '1', '1', '1']
    game.balls[0].position = 16
    game.balls[0].state = 'invalid'
    game.cards.players[0] = ['7']
    game.updateCardsWithMoves()

    const data = getAiData(game, 0)
    const move = new Futuro().choose(data)
    expect(move).toEqual([0, 0, 0, 23])
  })

  test('Should split 7 to move in goal', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 0
    game.tradeFlag = false
    game.tradedCards = ['1', '1', '1', '1']
    game.balls[0].position = 16
    game.balls[0].state = 'valid'
    game.cards.players[0] = ['7']
    game.updateCardsWithMoves()

    const data = getAiData(game, 0)
    const move = new Futuro().choose(data)
    expect(move).toEqual([0, 0, 0, 83])
  })

  test('Should split 7 to move in goal with minimal moves', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 0
    game.tradeFlag = false
    game.tradedCards = ['1', '1', '1', '1']
    game.balls[0].position = 80
    game.balls[0].state = 'goal'
    game.cards.players[0] = ['7']
    game.updateCardsWithMoves()

    const data = getAiData(game, 0)
    const move = new Futuro().choose(data)
    expect(move).toEqual([0, 0, 0, 83])

    game.performActionAfterStatistics(move)
    const move2 = new Futuro().choose(getAiData(game, 0))
    expect(move2).toEqual([0, 0, 0, 81])

    game.performActionAfterStatistics(move2)
    const move3 = new Futuro().choose(getAiData(game, 0))
    expect(move3).toEqual([0, 0, 0, 83])
  })

  test('Should split 7 to first clear path with two close balls and 4', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 0
    game.tradeFlag = false
    game.tradedCards = ['1', '1', '1', '1']
    game.balls[0].position = 16
    game.balls[0].state = 'invalid'
    game.balls[1].position = 78
    game.balls[1].state = 'valid'
    game.cards.players[0] = ['7', '4']
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move).toEqual([0, 0, 0, 17])

    game.performActionAfterStatistics(move)
    const move2 = new Futuro().choose(getAiData(game, 0))
    expect(move2).toEqual([0, 0, 1, 83])

    game.performActionAfterStatistics(move2)
    game.activePlayer = 0
    game.updateCardsWithMoves()
    const move3 = new Futuro().choose(getAiData(game, 0))
    expect(move3).toEqual([0, 0, 0, 82])
  })

  test('Should prefer moving 8 instead of aussetzen', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 0
    game.tradeFlag = false
    game.tradedCards = ['1', '1', '1', '1']
    game.balls[0].position = 16
    game.balls[0].state = 'invalid'
    game.cards.players[0] = ['8']
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move).toEqual([0, 0, 0, 24])
  })

  test('Should use engel to kill enemy', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 0
    game.tradeFlag = false
    game.tradedCards = ['1', '1', '1', '1']
    game.balls[4].position = 32
    game.balls[4].state = 'valid'
    game.cards.players[0] = ['13', 'engel']
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move).toEqual([0, 1, 5, 32])
  })

  test('Should use "aussetzen" instead of leaving proximity', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 0
    game.tradeFlag = false
    game.tradedCards = ['1', '1', '1', '1']
    game.balls[0].position = 79
    game.balls[0].state = 'valid'
    game.cards.players[0] = ['8']
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move).toEqual([0, 0, 'aussetzen'])
  })

  test('Should not trade card to clean up house if it is needed to move own ball into house', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['2', '9', '12', '10']
    game.balls[8].position = 88
    game.balls[8].state = 'goal'
    game.balls[0].position = 16
    game.balls[0].state = 'valid'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move?.[1]).not.toBe(0)
  })

  test('Should not trade card to clean up house if it is needed to move own ball into house in 2 move scenario', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['2', '13', '12', '5', '12']
    game.balls[8].position = 88
    game.balls[8].state = 'goal'
    game.balls[0].position = 74
    game.balls[0].state = 'valid'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move?.[1]).not.toBe(0)
    expect(move?.[1]).not.toBe(3)
  })

  test('Should not trade card to clean up house if it is needed to move own ball into house in 2 move scenario with 7', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['7', '13', '12', '4', '12']
    game.balls[8].position = 88
    game.balls[8].state = 'goal'
    game.balls[0].position = 74
    game.balls[0].state = 'valid'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move?.[1]).not.toBe(0)
    expect(move?.[1]).not.toBe(3)
  })

  test('Should not trade card to clean up house if it is needed to move own ball into house in 3 move scenario', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['2', '13', '10', '4', '12']
    game.balls[8].position = 88
    game.balls[8].state = 'goal'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move?.[1]).not.toBe(0)
    expect(move?.[1]).not.toBe(1)
    expect(move?.[1]).not.toBe(3)
  })

  test('Should not trade card that could help partner move into goal in the future if it is needed to own move ball into house', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['3', '9', '12', '10']
    game.balls[8].position = 63
    game.balls[8].state = 'goal'
    game.balls[4].position = 64
    game.balls[4].state = 'valid'
    game.balls[0].position = 16
    game.balls[0].state = 'valid'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move?.[1]).not.toBe(0)
  })

  test('Should trade card that allows to close shared last Ball if partner plays first', () => {
    const game = new Game(4, 2, true, false)
    game.activePlayer = 1
    game.cards.players[0] = ['2', '9', '12', '10']
    game.balls[0].position = 83
    game.balls[0].state = 'locked'
    game.balls[1].position = 82
    game.balls[1].state = 'locked'
    game.balls[2].position = 81
    game.balls[2].state = 'locked'
    game.balls[8].position = 88
    game.balls[8].state = 'locked'
    game.balls[9].position = 89
    game.balls[9].state = 'locked'
    game.balls[10].position = 90
    game.balls[10].state = 'locked'
    game.balls[11].position = 91
    game.balls[11].state = 'locked'
    game.balls[3].position = 79
    game.balls[3].state = 'valid'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move?.[1]).toBe(0)
  })

  test('Should trade card that allows to close shared last Ball if partner plays first', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['3', '9', '8', '7']
    game.activePlayer = 1
    game.balls[0].position = 83
    game.balls[0].state = 'locked'
    game.balls[1].position = 82
    game.balls[1].state = 'locked'
    game.balls[2].position = 81
    game.balls[2].state = 'locked'
    game.balls[8].position = 88
    game.balls[8].state = 'locked'
    game.balls[9].position = 89
    game.balls[9].state = 'locked'
    game.balls[10].position = 90
    game.balls[10].state = 'locked'
    game.balls[11].position = 91
    game.balls[11].state = 'locked'
    game.balls[3].position = 69
    game.balls[3].state = 'valid'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect(move?.[1]).toBe(1)
  })

  test('Should trade 1 even if it could be used to lock balls', () => {
    const game = new Game(4, 2, true, false)
    game.cards.players[0] = ['1', '1', '10', '12', '9']
    game.balls[0].position = 81
    game.balls[0].state = 'goal'
    game.balls[1].position = 82
    game.balls[1].state = 'goal'
    game.updateCardsWithMoves()

    const move = new Futuro().choose(getAiData(game, 0))
    expect([0, 1]).toContain(move?.[1])
  })
})
*/
