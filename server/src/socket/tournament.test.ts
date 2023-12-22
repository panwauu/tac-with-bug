import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets.js'
import { closeSockets } from '../test/handleSocket.js'

describe('Tournament test suite via socket.io', () => {
  let usersWithSockets: UserWithSocket[]

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 1 })
  })

  afterAll(async () => {
    await closeSockets(usersWithSockets)
  })

  test('Should not return table of last tournaments with missing data', async () => {
    const resNoFirst = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:loadTable', { limit: 1 } as any)
    expect(resNoFirst.status).toBe(500)

    const resNoLimit = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:loadTable', { first: 1 } as any)
    expect(resNoLimit.status).toBe(500)
  })

  test('Should return table of last tournaments', async () => {
    const table = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:loadTable', { filter: null, first: 0, limit: 1 })
    expect(table.status).toBe(200)
    expect(table.data?.total).toBeGreaterThan(0)
    expect(table.data?.tournaments.length).toBe(1)
  })

  test('Should return the last Tournament Winners', async () => {
    const winners = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:winners:get')
    expect(winners.status).toBe(200)
    expect(winners.data?.length).toBe(3)
  })
})
