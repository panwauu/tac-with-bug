import type { Friend } from '../sharedTypes/typesFriends'
import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
import type { GeneralSocketC } from '../test/socket'

describe('Friends test suite via socket.io', () => {
  let usersWithSockets: UserWithSocket[]
  let unauthenticatedSocket: GeneralSocketC

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 3 })
    unauthenticatedSocket = await getUnauthenticatedSocket()
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, unauthenticatedSocket])
  })

  test('Should not get friends without username', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:ofUser', undefined as any)
    expect(response.status).toBe(422)
  })

  test('Should not get friends with invalid username', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:ofUser', 'a')
    expect(response.status).toBe(500)
  })

  test('Should have no friends', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:ofUser', usersWithSockets[0].username)
    expect(response.status).toBe(200)
    expect(response.data).toEqual([])
  })

  test('Player should not be able to befriend himself', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:request', usersWithSockets[0].username)
    expect(response.status).toBe(500)
  })

  test('Player should not be able to befriend invalid player', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:request', 'a')
    expect(response.status).toBe(500)

    const responseNoPlayer = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:request', undefined as any)
    expect(responseNoPlayer.status).toBe(422)
  })

  test('Should be able to request friendship from other player and alert player', async () => {
    const promises: [Promise<Friend[]>, Promise<Friend[]>, Promise<{ username: string }>] = [
      usersWithSockets[0].socket.oncePromise('friends:update'),
      usersWithSockets[1].socket.oncePromise('friends:update'),
      usersWithSockets[1].socket.oncePromise('friends:new-request'),
    ]
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:request', usersWithSockets[1].username)
    const result = await Promise.all(promises)
    expect(response.status).toBe(200)
    expect(result[0].length).toBe(1)
    expect(result[0][0].username).toEqual(usersWithSockets[1].username)
    expect(result[0][0].status).toEqual('to')
    expect(result[1].length).toBe(1)
    expect(result[1][0].username).toEqual(usersWithSockets[0].username)
    expect(result[1][0].status).toEqual('from')
    expect(result[2].username).toEqual(usersWithSockets[0].username)
  })

  test('Uninvolved player should not see the requests of other players', async () => {
    const response = await usersWithSockets[2].socket.emitWithAck(5000, 'friends:ofUser', usersWithSockets[0].username)
    expect(response.status).toBe(200)
    expect(response.data).toEqual([])
  })

  test('Involved player should also not see the requests of other players - to', async () => {
    const response = await usersWithSockets[1].socket.emitWithAck(5000, 'friends:ofUser', usersWithSockets[0].username)
    expect(response.status).toBe(200)
    expect(response.data?.length).toBe(0)
  })

  test('Involved player should see the requests of other players - from', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:ofUser', usersWithSockets[1].username)
    expect(response.status).toBe(200)
    expect(response.data?.length).toBe(0)
  })

  test('Player should not be able to confirm a friendship which was initiated by himself', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:confirm', usersWithSockets[1].username)
    expect(response.status).toBe(500)
  })

  test('Player should not be able to confirm a friendship with invalid player', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:confirm', 'a')
    expect(response.status).toBe(500)
  })

  test('Player should not be able to confirm a friendship where there is none', async () => {
    const response = await usersWithSockets[2].socket.emitWithAck(5000, 'friends:confirm', usersWithSockets[1].username)
    expect(response.status).toBe(500)
  })

  test('Player should not be able to confirm a friendship without player', async () => {
    const response = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:confirm', undefined as any)
    expect(response.status).toBe(422)
  })

  test('Should be able to confirm friendship', async () => {
    const promises: [Promise<Friend[]>, Promise<Friend[]>, Promise<{ username: string }>] = [
      usersWithSockets[0].socket.oncePromise('friends:update'),
      usersWithSockets[1].socket.oncePromise('friends:update'),
      usersWithSockets[0].socket.oncePromise('friends:friend-confirmed'),
    ]
    const response = await usersWithSockets[1].socket.emitWithAck(5000, 'friends:confirm', usersWithSockets[0].username)
    const result = await Promise.all(promises)
    expect(response.status).toBe(200)
    expect(result[0].length).toBe(1)
    expect(result[0][0].username).toEqual(usersWithSockets[1].username)
    expect(result[0][0].status).toEqual('done')
    expect(result[1].length).toBe(1)
    expect(result[1][0].username).toEqual(usersWithSockets[0].username)
    expect(result[1][0].status).toEqual('done')
    expect(result[2].username).toEqual(usersWithSockets[1].username)
  })

  test('Uninvolved player should see consented friendhips of others', async () => {
    const response = await usersWithSockets[2].socket.emitWithAck(5000, 'friends:ofUser', usersWithSockets[0].username)
    expect(response.status).toBe(200)
    expect(response.data?.length).toBe(1)
    expect(response.data?.[0].username).toEqual(usersWithSockets[1].username)
    expect(response.data?.[0].status).toEqual('done')
    expect(typeof response.data?.[0].date).toEqual('string')
  })

  test('Uninvolved player should not be able to cancel unexisting friendship', async () => {
    const response = await usersWithSockets[2].socket.emitWithAck(5000, 'friends:cancel', usersWithSockets[0].username)
    expect(response.status).toBe(500)
  })

  test('Player should not be able to cancel friendship without player', async () => {
    const response = await usersWithSockets[2].socket.emitWithAck(5000, 'friends:cancel', undefined as any)
    expect(response.status).toBe(422)
  })

  test('Player should not be able to cancel friendship with invalid player', async () => {
    const response = await usersWithSockets[2].socket.emitWithAck(5000, 'friends:cancel', 'a')
    expect(response.status).toBe(500)
  })

  test('Should be able to cancel friendship', async () => {
    const playerToCancel = Math.random() > 0.5 ? 1 : 0
    const playerToBeCanceled = playerToCancel === 1 ? 0 : 1
    const promises: [Promise<Friend[]>, Promise<Friend[]>, Promise<{ username: string }>] = [
      usersWithSockets[0].socket.oncePromise('friends:update'),
      usersWithSockets[1].socket.oncePromise('friends:update'),
      usersWithSockets[playerToBeCanceled].socket.oncePromise('friends:friend-cancelled'),
    ]
    const response = await usersWithSockets[playerToCancel].socket.emitWithAck(5000, 'friends:cancel', usersWithSockets[playerToBeCanceled].username)
    const result = await Promise.all(promises)
    expect(response.status).toBe(200)
    expect(result[0].length).toBe(0)
    expect(result[1].length).toBe(0)
    expect(result[2].username).toEqual(usersWithSockets[playerToCancel].username)
  })

  test('Friendship should not be visible anymore', async () => {
    const response = await usersWithSockets[Math.floor(Math.random() * 3)].socket.emitWithAck(5000, 'friends:ofUser', usersWithSockets[0].username)
    expect(response.status).toBe(200)
    expect(response.data?.length).toBe(0)
  })

  test('User should be able to withdraw request', async () => {
    const promisesRequest: [Promise<Friend[]>, Promise<Friend[]>, Promise<{ username: string }>] = [
      usersWithSockets[1].socket.oncePromise('friends:update'),
      usersWithSockets[0].socket.oncePromise('friends:update'),
      usersWithSockets[0].socket.oncePromise('friends:new-request'),
    ]
    const responseRequest = await usersWithSockets[1].socket.emitWithAck(5000, 'friends:request', usersWithSockets[0].username)
    await Promise.all(promisesRequest)
    expect(responseRequest.status).toBe(200)

    const promises: [Promise<Friend[]>, Promise<Friend[]>, Promise<{ username: string }>] = [
      usersWithSockets[1].socket.oncePromise('friends:update'),
      usersWithSockets[0].socket.oncePromise('friends:update'),
      usersWithSockets[0].socket.oncePromise('friends:friend-withdrew'),
    ]
    const response = await usersWithSockets[1].socket.emitWithAck(5000, 'friends:cancel', usersWithSockets[0].username)
    const result = await Promise.all(promises)
    expect(response.status).toBe(200)
    expect(result[0].length).toBe(0)
    expect(result[1].length).toBe(0)
    expect(result[2].username).toEqual(usersWithSockets[1].username)
  })

  test('User should be able to decline request', async () => {
    const promisesRequest: [Promise<Friend[]>, Promise<Friend[]>, Promise<{ username: string }>] = [
      usersWithSockets[0].socket.oncePromise('friends:update'),
      usersWithSockets[1].socket.oncePromise('friends:update'),
      usersWithSockets[1].socket.oncePromise('friends:new-request'),
    ]
    const responseRequest = await usersWithSockets[0].socket.emitWithAck(5000, 'friends:request', usersWithSockets[1].username)
    await Promise.all(promisesRequest)
    expect(responseRequest.status).toBe(200)

    const promises: [Promise<Friend[]>, Promise<Friend[]>, Promise<{ username: string }>] = [
      usersWithSockets[0].socket.oncePromise('friends:update'),
      usersWithSockets[1].socket.oncePromise('friends:update'),
      usersWithSockets[0].socket.oncePromise('friends:friend-declined'),
    ]
    const response = await usersWithSockets[1].socket.emitWithAck(5000, 'friends:cancel', usersWithSockets[0].username)
    const result = await Promise.all(promises)
    expect(response.status).toBe(200)
    expect(result[0].length).toBe(0)
    expect(result[1].length).toBe(0)
    expect(result[2].username).toEqual(usersWithSockets[1].username)
  })

  test('Should require authentication', async () => {
    const resRequest = await unauthenticatedSocket.emitWithAck(5000, 'friends:request', '')
    expect(resRequest.status).toBe(500)

    const resConfirm = await unauthenticatedSocket.emitWithAck(5000, 'friends:confirm', '')
    expect(resConfirm.status).toBe(500)

    const resCancel = await unauthenticatedSocket.emitWithAck(5000, 'friends:cancel', '')
    expect(resCancel.status).toBe(500)
  })
})
