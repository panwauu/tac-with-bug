import type { CapturedType } from './capture'
import { sanitizeGameCapture } from './gameCaptureSanitation'
import rawTestData from './gameCaptureSanitation.test.json'

interface TestDataElement {
  id: number
  before: CapturedType[]
  after: CapturedType[]
}

interface TestData {
  dealCards: TestDataElement
  narr: TestDataElement
  tauschen: TestDataElement
  duplicateRows: TestDataElement
}

describe('test suite for the capture sanitation', () => {
  const testData = rawTestData as TestData

  beforeAll(async () => {
    for (const key in testData) {
      await testServer.pgPool.query('INSERT INTO savegames (id, gameid, game) VALUES ($1,$1,$2);', [
        testData[key as keyof TestData].id,
        JSON.stringify(testData[key as keyof TestData].before),
      ])
    }
  })

  it.each(Object.entries(testData))('should remove error in %s', async (key) => {
    const resBefore = await testServer.pgPool.query<{ game: CapturedType[] }>('SELECT game FROM savegames WHERE id=$1;', [testData[key as keyof TestData].id])
    await sanitizeGameCapture(testServer.pgPool, testData[key as keyof TestData].id)
    const resAfter = await testServer.pgPool.query<{ game: CapturedType[] }>('SELECT game FROM savegames WHERE id=$1;', [testData[key as keyof TestData].id])
    expect(resAfter.rows[0].game).toStrictEqual(testData[key as keyof TestData].after)
    expect(resBefore.rows[0].game).not.toStrictEqual(testData[key as keyof TestData].after)
  })
})
