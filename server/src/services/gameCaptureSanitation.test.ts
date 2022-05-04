import { TacServer } from '../server'
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
    let server: TacServer
    const testData = rawTestData as testData

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)

        for (const key in testData) {
            await server.pgPool.query('UPDATE savegames SET game=$2 WHERE id=$1;', [testData[key as keyof testData].id, JSON.stringify(testData[key as keyof testData].before)])
        }
    })

    afterAll(async () => {
        for (const key in testData) {
            await server.pgPool.query('UPDATE savegames SET game=$2 WHERE id=$1;', [testData[key as keyof testData].id, JSON.stringify(testData[key as keyof testData].after)])
        }

        await server.destroy()
    })

    it.each(Object.entries(testData))('should remove error in %s', async (key) => {
        const resBefore = await server.pgPool.query<{ game: capturedType[] }>('SELECT game FROM savegames WHERE id=$1;', [testData[key as keyof testData].id])
        await sanitizeGameCapture(server.pgPool, testData[key as keyof testData].id)
        const resAfter = await server.pgPool.query<{ game: capturedType[] }>('SELECT game FROM savegames WHERE id=$1;', [testData[key as keyof testData].id])
        expect(resAfter.rows[0].game).toStrictEqual(testData[key as keyof testData].after)
        expect(resBefore.rows[0].game).not.toStrictEqual(testData[key as keyof testData].after)
    })
})