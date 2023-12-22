import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets, connectSocket } from '../test/handleSocket'
import type { GeneralSocketC } from '../test/socket'

describe('Authentication Test Suite via Socket.io', () => {
  let usersWithSockets: UserWithSocket[]
  let socket: GeneralSocketC

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 2 })
    socket = await getUnauthenticatedSocket()
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, socket])
  })

  test('Should be able to logout without interfering with other sockets', async () => {
    const data = await usersWithSockets[0].socket.emitWithAck(5000, 'logout')
    expect(data.status).toBe(200)
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('Should not be able to login without token', async () => {
    const data = await usersWithSockets[0].socket.emitWithAck(5000, 'login', undefined as any)
    expect(data.status).toBe(422)
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('Should not be able to login with invalid token', async () => {
    const data = await usersWithSockets[0].socket.emitWithAck(5000, 'login', { token: '1234' })
    expect(data.status).toBe(400)
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('Should be able to login without interfering with other sockets', async () => {
    const data = await usersWithSockets[0].socket.emitWithAck(5000, 'login', { token: usersWithSockets[0].token })
    expect(data.status).toBe(200)
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('Should logout other socket with same userID', async () => {
    const logoutData = await usersWithSockets[0].socket.emitWithAck(5000, 'logout')
    expect(logoutData.status).toBe(200)

    const logoutOtherUserPromise = usersWithSockets[1].socket.oncePromise('logged_out')

    const loginData = await usersWithSockets[0].socket.emitWithAck(5000, 'login', { token: usersWithSockets[1].token })
    expect(loginData.status).toBe(200)
    await logoutOtherUserPromise

    await logoutOtherUserPromise
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('User with invalid token should be logged out', async () => {
    closeSockets([usersWithSockets[0].socket])
    // @ts-ignore
    usersWithSockets[0].socket.auth.token = '1234'
    const logoutProm = usersWithSockets[0].socket.oncePromise('logged_out')
    await connectSocket(usersWithSockets[0].socket)
    await logoutProm
  })
})
