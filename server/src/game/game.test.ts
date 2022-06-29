import { game } from '../game/game'
import { testCapturedMoves } from '../helpers/captureCompare'

test('Test constructor throws - 4', () => {
    expect(() => { new game(4, 2, true, true) }).not.toThrow()
    expect(() => { new game(4, 2, true, false) }).not.toThrow()
    expect(() => { new game(5, 2, true, true) }).toThrow()
    expect(() => { new game(3, 2, true, true) }).toThrow()
    expect(() => { new game(4, 0, true, true) }).toThrow()
    expect(() => { new game(4, 3, true, true) }).toThrow()
    expect(() => { new game(4, 1, true, true) }).toThrow()
})

test('Test constructor throws - 6', () => {
    expect(() => { new game(6, 2, true, false) }).not.toThrow()
    expect(() => { new game(6, 3, true, false) }).not.toThrow()
    expect(() => { new game(6, 3, true, true) }).not.toThrow()
    expect(() => { new game(6, 0, true, true) }).toThrow()
    expect(() => { new game(6, 1, true, true) }).toThrow()
    expect(() => { new game(6, 2, true, true) }).toThrow()
})

test('Test load Game', () => {
    const result = testCapturedMoves('4469prod')
    expect(result.equal).toBe(true)

    const json = result.game?.getJSON() ?? ''
    const gameInst = new game(0, 0, true, true, JSON.parse(json))
    expect(result.game).toEqual(gameInst)
})
