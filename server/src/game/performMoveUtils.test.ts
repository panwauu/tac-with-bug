import { cloneDeep } from 'lodash'
import { moveBallToHouse, moveBallsBetweenPositionsToHouse, sevenReconstructPath, ballInLastGoalPosition } from '../game/performMoveUtils'
import { ballHome, ballStart, ballGoal, initializeBalls } from '../game/ballUtils'

const ballsSample = initializeBalls(4)

// -------- ballInLastGoalPosition(balls, nBall, newPosition)
test('ballInLastGoalPosition', () => {
  const balls = cloneDeep(ballsSample)
  for (let i = 1; i < 4; i++) {
    balls[i].position = ballGoal(0, balls) + i
    balls[i].state = 'locked'
  }
  expect(ballInLastGoalPosition(balls, 0, ballGoal(0, balls))).toBe(true)
  expect(ballInLastGoalPosition(balls, 0, ballStart(0, balls))).toBe(false)

  balls[3].position = ballStart(0, balls)
  expect(ballInLastGoalPosition(balls, 0, ballGoal(0, balls) + 3)).toBe(true)
  expect(ballInLastGoalPosition(balls, 0, ballGoal(0, balls))).toBe(false)
})

// -------- moveBallToHouse
test('Test moveBallToHouse', () => {
  const balls = cloneDeep(ballsSample)
  balls[3].position = ballStart(0, balls)
  balls[3].state = 'invalid'

  moveBallToHouse(balls, 3)
  expect(balls[3].state).toBe('house')
  expect(balls[3].position).toBe(ballHome(0) + 3)
})

// -------- sevenReconstructPath(balls, nBall, goalPosition)
test('Test sevenReconstructPath', () => {
  const balls = cloneDeep(ballsSample)
  balls[0].position = ballGoal(0, balls) - 4
  balls[0].state = 'valid'
  expect(sevenReconstructPath(balls, 0, ballGoal(0, balls) + 1)).toEqual([
    ballGoal(0, balls) - 4,
    ballGoal(0, balls) - 3,
    ballGoal(0, balls) - 2,
    ballGoal(0, balls) - 1,
    ballStart(0, balls),
    ballGoal(0, balls),
    ballGoal(0, balls) + 1,
  ])
  expect(sevenReconstructPath(balls, 0, ballStart(0, balls) + 1)).toEqual([
    ballGoal(0, balls) - 4,
    ballGoal(0, balls) - 3,
    ballGoal(0, balls) - 2,
    ballGoal(0, balls) - 1,
    ballStart(0, balls),
    ballStart(0, balls) + 1,
  ])
  expect(() => {
    sevenReconstructPath(balls, 0, ballStart(0, balls) + 7)
  }).toThrow('Could not reconstruct Path of 7')
})

// -------- moveBallsBetweenPositionsToHouse(balls, nBall, goalPosition)
test('Test moveBallToHouse', () => {
  const balls = cloneDeep(ballsSample)
  balls[0].position = ballGoal(0, balls) - 3
  balls[0].state = 'valid'
  balls[1].position = ballGoal(0, balls) - 2
  balls[1].state = 'valid'
  balls[2].position = ballGoal(0, balls) - 1
  balls[2].state = 'valid'
  balls[3].position = ballStart(0, balls)
  balls[3].state = 'valid'
  balls[4].position = ballStart(0, balls) + 1
  balls[4].state = 'valid'
  balls[5].position = ballStart(0, balls) + 2
  balls[5].state = 'valid'
  balls[6].position = ballStart(0, balls) + 3
  balls[6].state = 'valid'

  moveBallsBetweenPositionsToHouse(balls, 0, ballStart(0, balls) + 3)
  expect(balls[1].position).toBe(ballHome(0))
  expect(balls[2].position).toBe(ballHome(0) + 1)
  expect(balls[3].position).toBe(ballHome(0) + 2)
  expect(balls[4].position).toBe(ballHome(4))
  expect(balls[5].position).toBe(ballHome(4) + 1)
  expect(balls[6].position).toBe(ballHome(4) + 2)
  expect(balls[1].state).toBe('house')
  expect(balls[2].state).toBe('house')
  expect(balls[3].state).toBe('house')
  expect(balls[4].state).toBe('house')
  expect(balls[5].state).toBe('house')
  expect(balls[6].state).toBe('house')
})
