import type { AckData, GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition'
import { io } from 'socket.io-client'
import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'

describe('Authentication Test Suite via Socket.io', () => {
  let usersWithSockets: UserWithSocket[]
  let socket: GeneralSocketC

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 2 })
    socket = io('http://localhost:1234') as any
    await new Promise((resolve) => {
      socket.on('connect', () => {
        resolve(null)
      })
    })
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, socket])
  })

  test('Should be able to logout without interfering with other sockets', async () => {
    const data = await new Promise<AckData<null>>((resolve) =>
      usersWithSockets[0].socket.emit('logout', (data) => {
        resolve(data)
      })
    )
    expect(data.status).toBe(200)
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('Should be able to login without interfering with other sockets', async () => {
    const data = await new Promise<AckData<null>>((resolve) =>
      usersWithSockets[0].socket.emit('login', { token: usersWithSockets[0].token }, (data) => {
        resolve(data)
      })
    )
    expect(data.status).toBe(200)
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('Should logout other socket with same userID', async () => {
    const logoutData = await new Promise<AckData<null>>((resolve) =>
      usersWithSockets[0].socket.emit('logout', (data) => {
        resolve(data)
      })
    )
    expect(logoutData.status).toBe(200)

    const logoutOtherUserPromise = new Promise((resolve) => {
      usersWithSockets[1].socket.once('logged_out', () => {
        resolve(true)
      })
    })

    const loginData = await new Promise<AckData<null>>((resolve) =>
      usersWithSockets[0].socket.emit('login', { token: usersWithSockets[1].token }, (data) => {
        resolve(data)
      })
    )
    expect(loginData.status).toBe(200)
    await logoutOtherUserPromise

    expect(await logoutOtherUserPromise).toBe(true)
    expect(usersWithSockets[0].socket.connected).toBe(true)
    expect(usersWithSockets[1].socket.connected).toBe(true)
    expect(socket.connected).toBe(true)
  })

  test('User with invalid token should be logged out', async () => {
    const clientSocket = io('http://localhost:1234', { auth: { token: '1234' } })
    const connProm = new Promise((resolve) => {
      clientSocket.on('connect', () => {
        console.log('conn')
        resolve(null)
      })
    })
    const logoutProm = new Promise((resolve) => {
      clientSocket.on('logged_out', () => {
        console.log('logout')
        resolve(null)
      })
    })
    expect(await connProm).toBe(null)
    expect(await logoutProm).toBe(null)
    clientSocket.close()
  })
})
