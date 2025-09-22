import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
import type { GeneralSocketC } from '../test/socket'

describe('Channel test suite via socket.io', () => {
  let usersWithSockets: UserWithSocket[], socket: GeneralSocketC
  let blockedUsersWithSockets: UserWithSocket[]

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 2 })
    blockedUsersWithSockets = await getUsersWithSockets({ ids: [15] })
    socket = await getUnauthenticatedSocket()
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, ...blockedUsersWithSockets, socket])
  })

  describe('Test channel communication', () => {
    let nMessagesBefore: number

    test('Should not load without channel name', async () => {
      const loadData = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:load', undefined as any)
      expect(loadData.status).toBe(500)
    })

    test('Should load the general channel', async () => {
      const loadData = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:load', { channel: 'general' })
      expect(loadData.status).toBe(200)
      expect(loadData.data?.channel).toBe('general')
      nMessagesBefore = loadData.data?.messages.length ?? 0
    })

    test('Should not send for unauthenticated user', async () => {
      const promise = await socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general', body: 'test' })
      expect(promise.status).toBe(500)
    })

    test('Should not send for invalid message', async () => {
      const resWithoutChannel = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:sendMessage', { body: 'test' } as any)
      expect(resWithoutChannel.status).toBe(500)

      const resWithoutBody = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general' } as any)
      expect(resWithoutBody.status).toBe(500)
    })

    test('Should not send to the general channel if blockedbymoderation', async () => {
      const promiseSend = await blockedUsersWithSockets[0].socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general', body: 'test' })
      expect(promiseSend.status).not.toBe(200)
    })

    test('Should send to the general channel and send update to all', async () => {
      const promises = [...usersWithSockets, ...blockedUsersWithSockets].map((uWS) => {
        return uWS.socket.oncePromise('channel:update')
      })
      const promiseSend = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general', body: 'test' })
      expect(promiseSend.status).toBe(200)

      const results = await Promise.all(promises)
      for (let i = 0; i < results.length; i++) {
        expect(results[i].channel).toBe('general')
        expect(results[i].messages.length).toBe(nMessagesBefore + 1)
      }
    })
  })
})
