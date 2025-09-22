import { Game } from '../../game/game'
import { projectMoveToGamePlayer } from './normalize'

describe('Test normalization', () => {
  test.todo('Shift cards')
  test.todo('Shift balls')

  test('Project move back should work for 4-Tac', () => {
    const game = new Game(4, 2, true, false)
    expect(projectMoveToGamePlayer(game, [0, 0, 'abwerfen'], 0)).toEqual([0, 0, 'abwerfen'])
    expect(projectMoveToGamePlayer(game, [0, 0, 9, 81], 0)).toEqual([0, 0, 9, 81])

    expect(projectMoveToGamePlayer(game, [0, 1, 'abwerfen'], 2)).toEqual([2, 1, 'abwerfen'])
    expect(projectMoveToGamePlayer(game, [0, 2, 3, 0], 1)).toEqual([1, 2, 7, 4])
    expect(projectMoveToGamePlayer(game, [0, 2, 3, 63], 2)).toEqual([2, 2, 11, 31])
    expect(projectMoveToGamePlayer(game, [0, 2, 3, 81], 3)).toEqual([3, 2, 15, 93])

    expect(projectMoveToGamePlayer(game, [1, 2, 3, 81], 1)).toEqual([1, 2, 3, 81])
    expect(projectMoveToGamePlayer(game, [2, 2, 3, 64], 1)).toEqual([1, 2, 15, 48])
  })

  test('Project move back should work for 6-Tac', () => {
    const game = new Game(6, 2, true, false)
    expect(projectMoveToGamePlayer(game, [0, 0, 'abwerfen'], 0)).toEqual([0, 0, 'abwerfen'])
    expect(projectMoveToGamePlayer(game, [0, 2, 9, 81], 0)).toEqual([0, 2, 9, 81])

    expect(projectMoveToGamePlayer(game, [0, 1, 'abwerfen'], 2)).toEqual([2, 1, 'abwerfen'])
    expect(projectMoveToGamePlayer(game, [0, 0, 3, 16], 1)).toEqual([1, 0, 7, 20])
    expect(projectMoveToGamePlayer(game, [0, 1, 3, 63], 2)).toEqual([2, 1, 11, 85])
    expect(projectMoveToGamePlayer(game, [0, 2, 3, 24], 3)).toEqual([3, 2, 15, 57])
    expect(projectMoveToGamePlayer(game, [0, 3, 3, 90], 4)).toEqual([4, 3, 19, 106])
    expect(projectMoveToGamePlayer(game, [0, 4, 3, 96], 5)).toEqual([5, 4, 23, 92])
  })
})
