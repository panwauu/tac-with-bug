import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
import type { GeneralSocketC } from '../test/socket'
import { numberOfMessagesPerLoad } from '../sharedDefinitions/chat'

describe('Channel test suite via socket.io', () => {
  let usersWithSockets: UserWithSocket[], socket: GeneralSocketC
  let blockedUsersWithSockets: UserWithSocket[]
  // The players of game 1 are the users with the ids 1 to 4
  let playerOfGame: UserWithSocket[], spectatorOfGame: UserWithSocket[]

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 2 })
    blockedUsersWithSockets = await getUsersWithSockets({ ids: [15] })
    playerOfGame = await getUsersWithSockets({ ids: [3] })
    spectatorOfGame = await getUsersWithSockets({ ids: [9] })
    socket = await getUnauthenticatedSocket()
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, ...blockedUsersWithSockets, ...playerOfGame, ...spectatorOfGame, socket])
  })

  describe('Test the game channel of game 1', () => {
    test('Should let a player of the game send a message', async () => {
      const res = await playerOfGame[0].socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'g-1', body: 'message of a player' })
      expect(res.status).toBe(200)
    })

    test('Should let a spectator load the channel but not write in it', async () => {
      const loadData = await spectatorOfGame[0].socket.emitWithAck(5000, 'channel:load', { channel: 'g-1' })
      expect(loadData.status).toBe(200)
      expect(loadData.data?.mayWrite).toBe(false)
      expect(loadData.data?.messages.at(-1)?.body).toBe('message of a player')

      const res = await spectatorOfGame[0].socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'g-1', body: 'message of a spectator' })
      expect(res.status).not.toBe(200)
    })

    test('Should signal a player that they may write in the channel', async () => {
      const loadData = await playerOfGame[0].socket.emitWithAck(5000, 'channel:load', { channel: 'g-1' })
      expect(loadData.status).toBe(200)
      expect(loadData.data?.mayWrite).toBe(true)
    })

    test('Should not signal an unauthenticated user that they may write in a channel', async () => {
      const loadData = await socket.emitWithAck(5000, 'channel:load', { channel: 'general' })
      expect(loadData.status).toBe(200)
      expect(loadData.data?.mayWrite).toBe(false)
    })
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
        expect(results[i].messages).toHaveLength(Math.min(nMessagesBefore + 1, numberOfMessagesPerLoad))
      }
    })

    test('Should load the channel lazily in pages', async () => {
      const channel = `test-${Date.now()}`
      for (let i = 0; i < numberOfMessagesPerLoad + 1; i++) {
        const res = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:sendMessage', { channel, body: `lazy-${i}` })
        expect(res.status).toBe(200)
      }

      const newestPage = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:load', { channel })
      expect(newestPage.status).toBe(200)
      expect(newestPage.data?.messages).toHaveLength(numberOfMessagesPerLoad)
      expect(newestPage.data?.hasOlderMessages).toBe(true)
      expect(newestPage.data?.messages.at(-1)?.body).toBe(`lazy-${numberOfMessagesPerLoad}`)

      const olderPage = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:load', { channel, beforeMessageId: newestPage.data?.messages[0].id })
      expect(olderPage.status).toBe(200)
      expect(olderPage.data?.messages).toHaveLength(1)
      expect(olderPage.data?.hasOlderMessages).toBe(false)
      expect(olderPage.data?.messages[0].body).toBe('lazy-0')
    })

    test('Should not load the channel with an invalid beforeMessageId', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'channel:load', { channel: 'general', beforeMessageId: 'invalid' } as any)
      expect(res.status).toBe(500)
    })
  })
})
