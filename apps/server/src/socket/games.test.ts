import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
import type { GeneralSocketC } from '../test/socket'

describe('Games test suite via socket.io', () => {
  let userWithSocket: UserWithSocket, unauthSocket: GeneralSocketC

  beforeAll(async () => {
    userWithSocket = (await getUsersWithSockets({ ids: [1] }))[0]
    unauthSocket = await getUnauthenticatedSocket()
  })

  afterAll(async () => {
    await closeSockets([userWithSocket, unauthSocket])
  })

  describe('Test games events', () => {
    test('Get the running games of the own account', async () => {
      const gamesResult = userWithSocket.socket.oncePromise('games:runningGamesOfUser')
      userWithSocket.socket.emit('games:getRunningGamesOfUser')

      const res = await gamesResult
      expect(Array.isArray(res)).toBe(true)
      expect(res.every((g) => g.running && g.status === 'running')).toBe(true)
    })

    test('An unauthenticated socket gets an empty list', async () => {
      const gamesResult = unauthSocket.oncePromise('games:runningGamesOfUser')
      unauthSocket.emit('games:getRunningGamesOfUser')

      expect(await gamesResult).toStrictEqual([])
    })

    test('Table data should return error when data is missing', async () => {
      const responseNoFirst = await userWithSocket.socket.emitWithAck(5000, 'games:getTableData', { limit: 10, username: 'a' } as any)
      expect(responseNoFirst.status).toBe(422)

      const responseNoLimit = await userWithSocket.socket.emitWithAck(5000, 'games:getTableData', { first: 10, username: 'a' } as any)
      expect(responseNoLimit.status).toBe(422)
    })

    test('Table data should return error when username is invalid', async () => {
      const response = await userWithSocket.socket.emitWithAck(5000, 'games:getTableData', { first: 0, limit: 10, sortField: 'created', sortOrder: 1, username: 'a' })
      expect(response.status).toBe(500)
    })

    test('Table data should return error when username is empty and unauth', async () => {
      const response = await unauthSocket.emitWithAck(5000, 'games:getTableData', { first: 0, limit: 10 })
      expect(response.status).toBe(500)
    })

    test('Table data should be possible for user himself', async () => {
      const response = await userWithSocket.socket.emitWithAck(5000, 'games:getTableData', { first: 0, limit: 10, sortField: 'created', sortOrder: 1 })
      expect(response.status).toBe(200)
      expect(response.data?.games.length).toBeGreaterThan(0)
      expect(response.data?.nEntries).toBeGreaterThan(0)
    })

    test('Table data should be possible for other user', async () => {
      const response = await unauthSocket.emitWithAck(5000, 'games:getTableData', { first: 0, limit: 10, username: userWithSocket.username })
      expect(response.status).toBe(200)
      expect(response.data?.games.length).toBeGreaterThan(0)
      expect(response.data?.nEntries).toBeGreaterThan(0)
    })

    test('Should return running games', async () => {
      const response = await unauthSocket.emitWithAck(5000, 'games:getRunningGames')
      expect(response.status).toBe(200)
      expect(response.data?.length).toBeGreaterThan(0)
    })
  })
})
