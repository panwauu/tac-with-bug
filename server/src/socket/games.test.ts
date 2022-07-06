import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { AckData } from '../sharedTypes/GeneralNamespaceDefinition'
import { gameForOverview } from '../sharedTypes/typesDBgame'
import { closeSockets } from '../test/handleSocket'

describe('Games test suite via socket.io', () => {
  let userWithSocket: UserWithSocket

  beforeAll(async () => {
    userWithSocket = (await getUsersWithSockets({ ids: [1] }))[0]
    console.log(userWithSocket.token)
  })

  afterAll(async () => {
    await closeSockets([userWithSocket])
  })

  describe('Test games events', () => {
    test('Get games summary', async () => {
      const gamesResult = new Promise<any>((resolve) => {
        userWithSocket.socket.once('games:getGames', (data: any) => {
          resolve(data)
        })
      })

      userWithSocket.socket.emit('games:getSummary')

      const res = await gamesResult
      expect(res.open).not.toBeUndefined()
    })

    test('Table data should return error when username is invalid', async () => {
      const response = await new Promise<AckData<{ games: gameForOverview[]; nEntries: number }>>((resolve) => {
        userWithSocket.socket.emit('games:getTableData', { first: 0, limit: 10, sortField: 'created', sortOrder: 1, username: 'a' }, (data) => {
          resolve(data)
        })
      })
      expect(response.status).toBe(500)
    })

    test('Table data should be possible for user himself', async () => {
      const response = await new Promise<
        AckData<{
          games: gameForOverview[]
          nEntries: number
        }>
      >((resolve) =>
        userWithSocket.socket.emit('games:getTableData', { first: 0, limit: 10, sortField: 'created', sortOrder: 1 }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.games.length).toBeGreaterThan(0)
      expect(response.data?.nEntries).toBeGreaterThan(0)
    })
  })

  test.todo('Test getRunningGames')
})
