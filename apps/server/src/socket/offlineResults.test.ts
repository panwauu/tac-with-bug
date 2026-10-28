import { getUnauthenticatedSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
import type { GeneralSocketC } from '../test/socket'
import { calculateBotStatistic } from '../services/platformStatistic'

describe('Results of games against the AI in the browser', () => {
  let sockets: GeneralSocketC[]

  beforeAll(async () => {
    sockets = await Promise.all([1, 2, 3].map(() => getUnauthenticatedSocket()))
  })

  afterAll(async () => {
    await closeSockets(sockets)
  })

  test('only valid results are stored', async () => {
    const wrongMode = await sockets[0].emitWithAck(5000, 'ki:result', { mode: 'solo' as any, level: 'theo', won: true, cards: null })
    expect(wrongMode.status).toBe(422)
    const wrongLevel = await sockets[0].emitWithAck(5000, 'ki:result', { mode: 'klassisch', level: 'unknown', won: true, cards: null })
    expect(wrongLevel.status).toBe(422)
    const levelOfOtherMode = await sockets[0].emitWithAck(5000, 'ki:result', { mode: 'drei', level: 'theo', won: true, cards: null })
    expect(levelOfOtherMode.status).toBe(422)

    const res = await testServer.pgPool.query('SELECT COUNT(*)::int AS n FROM offline_results;')
    expect(res.rows[0].n).toBe(0)
  })

  test('a socket reports at most one result per minute', async () => {
    const first = await sockets[0].emitWithAck(5000, 'ki:result', { mode: 'klassisch', level: 'theo', won: false, cards: null })
    expect(first.status).toBe(200)
    const second = await sockets[0].emitWithAck(5000, 'ki:result', { mode: 'klassisch', level: 'theo', won: true, cards: null })
    expect(second.status).toBe(429)

    const other = await sockets[1].emitWithAck(5000, 'ki:result', { mode: 'klassisch', level: 'theo', won: true, cards: null })
    expect(other.status).toBe(200)
    const koop = await sockets[2].emitWithAck(5000, 'ki:result', { mode: 'koop', level: 'koop', won: true, cards: 140 })
    expect(koop.status).toBe(200)
  })

  test('the bot statistics count them per level', async () => {
    const stats = await calculateBotStatistic(testServer.pgPool)
    // Luise Langfinger (13, theo): two games, the AI won one of them
    expect(stats.find((s) => s.botID === 13)?.browser).toEqual({ games: 2, wins: 1, averageCards: null })
    expect(stats.find((s) => s.botID === 30)?.browser).toEqual({ games: 1, wins: 0, averageCards: 140 })
  })
})
