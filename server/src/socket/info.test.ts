import { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition'
import { GameSocketC } from '../../../shared/types/GameNamespaceDefinition'

import { io } from 'socket.io-client'
import { registerGameSocket } from '../test/handleGameSocket'
import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'

describe('Info sest suite via socket.io', () => {
  let usersWithSockets: UserWithSocket[], socket: GeneralSocketC, gameSocket: GameSocketC
  const gameID = 1

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2] })
  })

  afterAll(async () => {
    await closeSockets([gameSocket, ...usersWithSockets, socket])
  })

  test('On disconnect the number of connections should be sent', async () => {
    const disconnectPromise = new Promise((resolve) => {
      usersWithSockets[0].socket.once('disconnect', () => {
        resolve(null)
      })
    })
    const updatePromise = new Promise<any>((resolve) => {
      usersWithSockets[1].socket.once('info:serverConnections', (data) => {
        resolve(data)
      })
    })

    usersWithSockets[0].socket.disconnect()
    await disconnectPromise
    const update = await updatePromise
    expect(update.total).toBe(1)
    expect(update.authenticated).toBe(1)
    expect(update.game).toBe(0)
  })

  test('On new connection the number of connections should be sent', async () => {
    const updatePromise = new Promise<any>((resolve) => {
      usersWithSockets[1].socket.once('info:serverConnections', (data) => {
        resolve(data)
      })
    })
    socket = io('http://localhost:1234') as any
    const connectPromise = new Promise((resolve) => {
      socket.once('connect', () => {
        resolve(null)
      })
    })
    const unauthUpdatePromise = new Promise<any>((resolve) => {
      socket.once('info:serverConnections', (data) => {
        resolve(data)
      })
    })

    await connectPromise
    const update = await updatePromise
    const updateUnauth = await unauthUpdatePromise
    expect(update.total).toBe(2)
    expect(update.authenticated).toBe(1)
    expect(update.game).toBe(0)
    expect(updateUnauth.total).toBe(2)
    expect(updateUnauth.authenticated).toBe(1)
    expect(updateUnauth.game).toBe(0)
  })

  test('On new game connection the number of connections should be sent', async () => {
    const updatePromise = new Promise<any>((resolve) => {
      usersWithSockets[1].socket.once('info:serverConnections', (data) => {
        resolve(data)
      })
    })
    const unauthUpdatePromise = new Promise<any>((resolve) => {
      socket.once('info:serverConnections', (data) => {
        resolve(data)
      })
    })
    gameSocket = await registerGameSocket(gameID, usersWithSockets[1].token)

    const update = await updatePromise
    const updateUnauth = await unauthUpdatePromise
    expect(update.total).toBe(2)
    expect(update.authenticated).toBe(1)
    expect(update.game).toBe(1)
    expect(updateUnauth.total).toBe(2)
    expect(updateUnauth.authenticated).toBe(1)
    expect(updateUnauth.game).toBe(1)
  })
})
