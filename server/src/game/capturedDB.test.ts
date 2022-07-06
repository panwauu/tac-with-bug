import { repeatGame } from '../test/captureCompare'

describe('Test that all tests saved in savegames are running', () => {
  const nGames = 100,
    ids: (number | null)[] = new Array(nGames).fill(null)

  beforeAll(async () => {
    const res = await testServer.pgPool.query('SELECT id FROM savegames ORDER BY RANDOM() LIMIT $1;', [nGames])
    res.rows.forEach((r: any, i: any) => {
      ids[i] = r.id
    })
  })

  test.each(Array.from(Array(nGames).keys()))(`Reconstruct random saved game %i/${nGames - 1}`, async (i) => {
    const id = ids[i]
    if (id === null) {
      return
    }

    const res = await testServer.pgPool.query('SELECT * FROM savegames WHERE id=$1;', [id])
    try {
      const result = repeatGame(res.rows[0].game)
      if (!result.equal) {
        throw new Error(`Test failded at gameID ${res.rows[0].id}`)
      }
      expect(result.equal).toBe(true)
    } catch (err) {
      throw new Error(`Test failded at gameID ${res.rows[0].id}`)
    }
  })
})
