import { capturedType } from './capture'
import { sanitizeGameCapture } from './gameCaptureSanitation'
import rawTestData from './gameCaptureSanitation.test.json'

interface testDataElement {
    id: number,
    before: capturedType[],
    after: capturedType[]
}

interface testData {
    dealCards: testDataElement
    narr: testDataElement
    tauschen: testDataElement
    duplicateRows: testDataElement
}

describe('test suite for the capture sanitation', () => {
    const testData = rawTestData as testData

    beforeAll(async () => {
        for (const key in testData) {
            await testServer.pgPool.query('INSERT INTO savegames (id, gameid, game) VALUES ($1,$1,$2);',
                [testData[key as keyof testData].id, JSON.stringify(testData[key as keyof testData].before)])
        }
    })

    it.each(Object.entries(testData))('should remove error in %s', async (key) => {
        const resBefore = await testServer.pgPool.query<{ game: capturedType[] }>('SELECT game FROM savegames WHERE id=$1;', [testData[key as keyof testData].id])
        await sanitizeGameCapture(testServer.pgPool, testData[key as keyof testData].id)
        const resAfter = await testServer.pgPool.query<{ game: capturedType[] }>('SELECT game FROM savegames WHERE id=$1;', [testData[key as keyof testData].id])
        expect(resAfter.rows[0].game).toStrictEqual(testData[key as keyof testData].after)
        expect(resBefore.rows[0].game).not.toStrictEqual(testData[key as keyof testData].after)
    })
})
