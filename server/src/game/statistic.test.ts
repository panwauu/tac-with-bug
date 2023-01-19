import { testCapturedMoves } from '../test/captureCompare'
import type { GameStatisticCardsType } from '../sharedTypes/typesStatistic'

test('Test with captured  - test kicked balls WITHOUT TAC', () => {
  const result = testCapturedMoves('170', 4, 2, false)
  expect(result.game?.statistic[0].actions['nBallsLost']).toBe(1)
  expect(result.game?.statistic[0].actions['nBallsKickedEnemy']).toBe(1)
  expect(result.game?.statistic[0].actions['nBallsKickedOwnTeam']).toBe(0)
  expect(result.game?.statistic[0].actions['nBallsKickedSelf']).toBe(1)

  expect(result.game?.statistic[1].actions['nBallsLost']).toBe(0)
  expect(result.game?.statistic[1].actions['nBallsKickedEnemy']).toBe(1)
  expect(result.game?.statistic[1].actions['nBallsKickedOwnTeam']).toBe(0)
  expect(result.game?.statistic[1].actions['nBallsKickedSelf']).toBe(0)

  expect(result.game?.statistic[2].actions['nBallsLost']).toBe(2)
  expect(result.game?.statistic[2].actions['nBallsKickedEnemy']).toBe(0)
  expect(result.game?.statistic[2].actions['nBallsKickedOwnTeam']).toBe(0)
  expect(result.game?.statistic[2].actions['nBallsKickedSelf']).toBe(0)

  expect(result.game?.statistic[3].actions['nBallsLost']).toBe(1)
  expect(result.game?.statistic[3].actions['nBallsKickedEnemy']).toBe(1)
  expect(result.game?.statistic[3].actions['nBallsKickedOwnTeam']).toBe(0)
  expect(result.game?.statistic[3].actions['nBallsKickedSelf']).toBe(0)
})

test('Test with captured 214  - test cards during small game', () => {
  const result = testCapturedMoves('214', 4, 2, false)

  expect(result.game?.statistic[0].cards['total']).toEqual([6, 5, 2])
  expect(result.game?.statistic[1].cards['total']).toEqual([4, 0, 2])
  expect(result.game?.statistic[2].cards['total']).toEqual([5, 5, 2])
  expect(result.game?.statistic[3].cards['total']).toEqual([5, 4, 2])

  expect(countSpecialCards(result.game?.statistic[0].cards)).toEqual([2, 2, 2])
  expect(countSpecialCards(result.game?.statistic[1].cards)).toEqual([2, 0, 0])
  expect(countSpecialCards(result.game?.statistic[2].cards)).toEqual([2, 2, 1])
  expect(countSpecialCards(result.game?.statistic[3].cards)).toEqual([1, 1, 2])
})

function countSpecialCards(cards: GameStatisticCardsType | undefined) {
  const arr = [0, 0, 0]
  if (cards === undefined) {
    return arr
  }

  for (const [key, value] of Object.entries(cards)) {
    if (key !== 'total') {
      ;[0, 1, 2].forEach((i) => {
        arr[i] += value[i]
      })
    }
  }
  return arr
}

test('Test with captured 241  - test cards for 7', () => {
  const result = testCapturedMoves('241', 4, 2, false)

  expect(result.game?.statistic[0].cards['total']).toEqual([1, 1, 1])
  expect(result.game?.statistic[1].cards['total']).toEqual([1, 1, 1])
  expect(result.game?.statistic[2].cards['total']).toEqual([2, 2, 1])
  expect(result.game?.statistic[3].cards['total']).toEqual([1, 1, 1])

  expect(result.game?.statistic[0].cards['1']).toEqual([1, 1, 1])
  expect(result.game?.statistic[1].cards['1']).toEqual([1, 1, 1])
  expect(result.game?.statistic[2].cards['1']).toEqual([1, 1, 1])
  expect(result.game?.statistic[3].cards['1']).toEqual([1, 1, 1])

  expect(result.game?.statistic[0].cards['7']).toEqual([0, 0, 0])
  expect(result.game?.statistic[1].cards['7']).toEqual([0, 0, 0])
  expect(result.game?.statistic[2].cards['7']).toEqual([1, 1, 0])
  expect(result.game?.statistic[3].cards['7']).toEqual([0, 0, 0])
})

test('Test with captured 244  - test cards for 7 / tac after 7', () => {
  const result = testCapturedMoves('244', 4, 2, false)

  expect(result.game?.statistic[0].cards['total']).toEqual([2, 2, 1])
  expect(result.game?.statistic[1].cards['total']).toEqual([2, 2, 1])
  expect(result.game?.statistic[2].cards['total']).toEqual([2, 2, 1])
  expect(result.game?.statistic[3].cards['total']).toEqual([2, 2, 1])

  expect(result.game?.statistic[0].cards['1']).toEqual([1, 1, 1])
  expect(result.game?.statistic[1].cards['1']).toEqual([1, 1, 1])
  expect(result.game?.statistic[2].cards['1']).toEqual([1, 1, 1])
  expect(result.game?.statistic[3].cards['1']).toEqual([1, 1, 1])

  expect(result.game?.statistic[0].cards['7']).toEqual([1, 1, 0])
  expect(result.game?.statistic[1].cards['7']).toEqual([0, 0, 0])
  expect(result.game?.statistic[2].cards['7']).toEqual([1, 1, 0])
  expect(result.game?.statistic[3].cards['7']).toEqual([1, 1, 0])

  expect(result.game?.statistic[0].cards['tac']).toEqual([0, 0, 0])
  expect(result.game?.statistic[1].cards['tac']).toEqual([1, 1, 0])
  expect(result.game?.statistic[2].cards['tac']).toEqual([0, 0, 0])
  expect(result.game?.statistic[3].cards['tac']).toEqual([0, 0, 0])
})
