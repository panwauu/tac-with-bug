import { cloneDeep } from 'lodash'
import { game } from '../../game/game'
import { normalizeAction, normalizeGame, unnormalizeAction } from './normalize'

describe('Test game normalization', () => {
  const definedGame = new game(4, 2, true, false)
  definedGame.cards.players[0] = ['1', '1', '3', '4', '5']
  definedGame.cards.players[1] = ['1', '2', '3', '4', '5']
  definedGame.cards.players[2] = ['1', '2', '3', '4', '5']
  definedGame.cards.players[3] = ['1', '2', '3', '4', '5']
  definedGame.cards.deck = []
  definedGame.cards.dealingPlayer = 0
  definedGame.activePlayer = 0
  definedGame.updateCardsWithMoves()

  test('Should not change the already ordered game', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    const norm = normalizeGame(g, 0)
    expect(Math.abs(norm.playersShiftedBy)).toBe(0)
    expect(norm.cardsNewOrder).toEqual([0, 1, 2, 3, 4])
    expect(norm.ballsNewOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(norm.game).toEqual(g)
  })

  test('Should be able to reorder players', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    const norm = normalizeGame(g, 1)
    expect(Math.abs(norm.playersShiftedBy)).toBe(1)
    expect(norm.cardsNewOrder).toEqual([0, 1, 2, 3, 4])
    expect(norm.ballsNewOrder).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3])
    expect(norm.game.balls.map((b) => b.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  test('Should be able to reorder cards', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.cards.players[0] = ['2', '1', 'tac', '4', '5']
    const norm = normalizeGame(g, 0)
    expect(Math.abs(norm.playersShiftedBy)).toBe(0)
    expect(norm.cardsNewOrder).toEqual([1, 0, 3, 4, 2])
    expect(norm.ballsNewOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  test('Should be able to reorder balls to match definedGame', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.balls[0].position = 1
    g.balls[1].position = 0
    g.priorBalls[0].position = 1
    g.priorBalls[1].position = 0
    const norm = normalizeGame(g, 0)
    expect(Math.abs(norm.playersShiftedBy)).toBe(0)
    expect(norm.cardsNewOrder).toEqual([0, 1, 2, 3, 4])
    expect(norm.ballsNewOrder).toEqual([1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(norm.game).toEqual(definedGame)
  })

  test('Should be able to reorder balls', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.balls[0].position = 32
    g.balls[3].position = 0
    g.balls[4].position = 84
    const norm = normalizeGame(g, 0)
    expect(Math.abs(norm.playersShiftedBy)).toBe(0)
    expect(norm.cardsNewOrder).toEqual([0, 1, 2, 3, 4])
    expect(norm.ballsNewOrder).toEqual([3, 1, 2, 0, 5, 6, 7, 4, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  test('Should be able to shift player with changed balls without balls reorder', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.balls[0].position = 16
    g.balls[1].position = 17
    g.balls[2].position = 18
    g.balls[3].position = 19
    g.balls[7].position = 84
    g.balls[15].position = 92
    const norm = normalizeGame(g, 2)
    expect(Math.abs(norm.playersShiftedBy)).toBe(2)
    expect(norm.cardsNewOrder).toEqual([0, 1, 2, 3, 4])
    expect(norm.game.balls.map((b) => b.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 84, 48, 49, 50, 51, 12, 13, 14, 92])
    expect(norm.ballsNewOrder).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7])
  })

  test('Should be able to shift player with changed balls with balls reorder', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.balls[0].position = 16
    g.balls[1].position = 17
    g.balls[2].position = 18
    g.balls[3].position = 19
    g.balls[7].position = 84
    g.balls[12].position = 92
    const norm = normalizeGame(g, 2)
    expect(Math.abs(norm.playersShiftedBy)).toBe(2)
    expect(norm.cardsNewOrder).toEqual([0, 1, 2, 3, 4])
    expect(norm.game.balls.map((b) => b.position)).toEqual([0, 1, 2, 3, 5, 6, 7, 84, 48, 49, 50, 51, 12, 13, 14, 92])
    expect(norm.ballsNewOrder).toEqual([8, 9, 10, 11, 13, 14, 15, 12, 0, 1, 2, 3, 4, 5, 6, 7])
  })

  test('Should be able to shift player with changed balls with balls reorder', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.cards.players[0] = ['2', '1', '3', '4', '5']
    g.cards.players[1] = ['2', '1', '4', '3', '5']
    g.cards.players[2] = ['2', '1', '5', '4', '3']
    g.cards.players[3] = ['1', '3', '3', '5', '4']
    g.balls[0].position = 16
    const norm = normalizeGame(g, 1)
    expect(Math.abs(norm.playersShiftedBy)).toBe(1)
    expect(norm.cardsNewOrder).toEqual([1, 0, 3, 2, 4])
    expect(norm.game.balls.map((b) => b.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 64])
    expect(norm.ballsNewOrder).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 2, 3, 0])
  })
})

describe('Test action normalization', () => {
  const definedGame = new game(4, 2, true, false)
  definedGame.cards.players[0] = ['1', '2', '3', '4', '5']
  definedGame.cards.players[1] = ['1', '2', '3', '4', '5']
  definedGame.cards.players[2] = ['1', '2', '3', '4', '5']
  definedGame.cards.players[3] = ['1', '2', '3', '4', '5']
  definedGame.cards.deck = []
  definedGame.cards.dealingPlayer = 0
  definedGame.activePlayer = 0
  definedGame.updateCardsWithMoves()

  test('Un/normalize should not change for normalized game', () => {
    expect(normalizeAction([0, 0, 'abwerfen'], { cardsNewOrder: [0, 1, 2, 3, 4], ballsNewOrder: Array.from(Array(16).keys()), game: definedGame, playersShiftedBy: 0 })).toEqual([
      0,
      0,
      'abwerfen',
    ])
    expect(unnormalizeAction([0, 0, 'abwerfen'], { cardsNewOrder: [0, 1, 2, 3, 4], ballsNewOrder: Array.from(Array(16).keys()), game: definedGame, playersShiftedBy: 0 })).toEqual([
      0,
      0,
      'abwerfen',
    ])
  })

  test('Normalize should shift player without shifting cards', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    const norm = normalizeGame(g, 1)
    expect(normalizeAction([1, 0, 'abwerfen'], norm)).toEqual([0, 0, 'abwerfen'])
    expect(normalizeAction([1, 1, 'abwerfen'], norm)).toEqual([0, 1, 'abwerfen'])
  })

  test('Normalize should shift player with shifting cards', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.cards.players[2] = ['2', '1', '3', '4', '5']
    const norm = normalizeGame(g, 2)
    expect(norm.cardsNewOrder).toEqual([1, 0, 2, 3, 4])
    expect(normalizeAction([2, 0, 'abwerfen'], norm)).toEqual([0, 1, 'abwerfen'])
    expect(normalizeAction([2, 1, 'abwerfen'], norm)).toEqual([0, 0, 'abwerfen'])
    expect(normalizeAction([2, 2, 'abwerfen'], norm)).toEqual([0, 2, 'abwerfen'])
  })

  test('Normalize should shift player with duplicate cards and correct positions', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.cards.players[3] = ['1', '1', '1', '4', '5']
    const norm = normalizeGame(g, 3)
    expect(norm.cardsNewOrder).toEqual([0, 1, 2, 3, 4])
    expect(normalizeAction([3, 1, 12, 64], norm)).toEqual([0, 0, 0, 16])
    expect(normalizeAction([3, 2, 14, 64], norm)).toEqual([0, 0, 2, 16])
    expect(normalizeAction([3, 0, 13, 64], norm)).toEqual([0, 0, 1, 16])
  })

  test('Normalize should correct ballindex with shifting balls', () => {
    const g = new game(4, 2, true, false, cloneDeep(definedGame))
    g.balls[0].position = 64
    g.balls[1].position = 48
    g.balls[2].position = 32
    g.balls[3].position = 16
    const norm = normalizeGame(g, 0)
    expect(norm.ballsNewOrder).toEqual([3, 2, 1, 0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(normalizeAction([0, 1, 3, 18], norm)).toEqual([0, 1, 0, 18])
    expect(normalizeAction([0, 2, 2, 35], norm)).toEqual([0, 2, 1, 35])
    expect(normalizeAction([0, 1, 1, 50], norm)).toEqual([0, 1, 2, 50])
    expect(normalizeAction([0, 1, 0, 66], norm)).toEqual([0, 1, 3, 66])
  })
})
