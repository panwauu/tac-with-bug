import { repeatGame } from '../helpers/captureCompare';
import { TacServer } from '../server';

describe('Test that all tests saved in savegames are running', () => {
    let server: TacServer;
    const nGames = 100, ids: (number | null)[] = new Array(nGames).fill(null);

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        const res = await server.pgPool.query('SELECT id FROM savegames ORDER BY RANDOM() LIMIT $1;', [nGames])
        res.rows.forEach((r, i) => { ids[i] = r.id })
    })

    afterAll(async () => {
        await server.destroy()
    })

    test.each(Array.from(Array(nGames).keys()))(`Reconstruct random saved game %i/${nGames - 1}`, async (i) => {
        const id = ids[i]
        if (id === null) { return }

        const res = await server.pgPool.query('SELECT * FROM savegames WHERE id=$1;', [id])
        try {
            const result = repeatGame(res.rows[0].game)
            if (!result.equal) { throw new Error(`Test failded at gameID ${res.rows[0].id}`) }
            expect(result.equal).toBe(true)
        } catch (err) {
            throw new Error(`Test failded at gameID ${res.rows[0].id}`)
        }
    })
})
