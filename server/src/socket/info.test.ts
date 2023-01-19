import type { GameSocketC } from '../sharedTypes/GameNamespaceDefinition'
import type { GeneralSocketC } from '../test/socket'

import { registerGameSocket } from '../test/handleGameSocket'
import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets, connectSocket } from '../test/handleSocket'

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
    const updatePromise = usersWithSockets[1].socket.oncePromise('info:serverConnections')
    await closeSockets([usersWithSockets[0].socket])
    const update = await updatePromise
    expect(update.total).toBe(1)
    expect(update.authenticated).toBe(1)
    expect(update.game).toBe(0)
  })

  test('On new connection the number of connections should be sent', async () => {
    const updatePromise = usersWithSockets[1].socket.oncePromise('info:serverConnections')
    socket = await getUnauthenticatedSocket({ connect: false })
    const unauthUpdatePromise = socket.oncePromise('info:serverConnections')

    await connectSocket(socket)
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
    const updatePromise = usersWithSockets[1].socket.oncePromise('info:serverConnections')
    const unauthUpdatePromise = socket.oncePromise('info:serverConnections')
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
