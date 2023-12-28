import { initializeBalls } from 'src/game/ballUtils'
import { normalizedNecessaryForwardMovesToEndOfGoal } from './utils'

describe('Test Bot Utils', () => {
  test('normalizedNecessaryForwardMovesToEndOfGoal', () => {
    const balls = initializeBalls(4)

    expect(normalizedNecessaryForwardMovesToEndOfGoal(0, 0, balls)).toBe(0)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(17, 0, balls)).toBe(1 - 67 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(79, 0, balls)).toBe(1 - 5 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(80, 0, balls)).toBe(1 - 3 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(83, 0, balls)).toBe(1)

    expect(normalizedNecessaryForwardMovesToEndOfGoal(4, 4, balls)).toBe(0)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(33, 4, balls)).toBe(1 - 67 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(31, 4, balls)).toBe(1 - 5 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(84, 4, balls)).toBe(1 - 3 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(87, 4, balls)).toBe(1)

    expect(normalizedNecessaryForwardMovesToEndOfGoal(8, 8, balls)).toBe(0)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(49, 8, balls)).toBe(1 - 67 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(47, 8, balls)).toBe(1 - 5 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(88, 8, balls)).toBe(1 - 3 / 68)
    expect(normalizedNecessaryForwardMovesToEndOfGoal(91, 8, balls)).toBe(1)
  })
})
