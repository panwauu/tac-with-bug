import type { GameSocketC } from '../test/socket'
import type { Substitution } from '../sharedTypes/game'

import { UserWithSocket, getUsersWithSockets } from '../test/handleUserSockets'
import { initiateGameSocket } from '../test/handleGameSocket'
import { closeSockets, connectSocket, waitForEventOnSockets } from '../test/handleSocket'
import { sleep } from '../helpers/sleep'

const substitutionStates: Record<string, Omit<Substitution, 'startDate'>> = {
  afterOffer: {
    acceptedByIndex: [],
    substitutionUserID: 5,
    substitutionUsername: 'UserE',
    playerIndexToSubstitute: 2,
  },
  afterAccept1: {
    acceptedByIndex: [0],
    substitutionUserID: 5,
    substitutionUsername: 'UserE',
    playerIndexToSubstitute: 2,
  },
  afterAccept2: {
    acceptedByIndex: [0, 1],
    substitutionUserID: 5,
    substitutionUsername: 'UserE',
    playerIndexToSubstitute: 2,
  },
}

describe('Game test suite via socket.io', () => {
  let usersWithSockets: UserWithSocket[]
  const gameSockets: GameSocketC[] = []
  const gameID = 1

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3, 4, 5, 6] })
    for (const user of usersWithSockets) {
      gameSockets.push(initiateGameSocket(gameID, user.token))
    }
    await Promise.all(
      gameSockets.map((s) => {
        return connectSocket(s)
      })
    )
    await sleep(1000)
  })

  afterAll(async () => {
    await closeSockets([...gameSockets, ...usersWithSockets.map((uWS) => uWS.socket)])
  })

  test('Should start substitution sucessfully', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:offer')
    expect(offerRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toMatchObject(substitutionStates.afterOffer)
      expect(Date.now() - update.substitution.startDate).toBeLessThan(1000)
    }
  })

  test('Should not start substitution if already running', async () => {
    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:offer')
    expect(offerRes.status).toBe(500)
  })

  test('Should stop if rejected', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const rejectRes = await gameSockets[0].emitWithAck(5000, 'substitution:answer', { accept: false })
    expect(rejectRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toBeNull()
    }
  })

  test('Should not be accepted by player 1 if was rejected', async () => {
    const acceptRes = await gameSockets[0].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be rejected by player 1 if was rejected', async () => {
    const acceptRes = await gameSockets[0].emitWithAck(5000, 'substitution:answer', { accept: false })
    expect(acceptRes.status).toBe(500)
  })

  test('Should start substitution sucessfully again', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:offer')
    expect(offerRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toMatchObject(substitutionStates.afterOffer)
      expect(Date.now() - update.substitution.startDate).toBeLessThan(1000)
    }
  })

  test('Should be accepted by player 1', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const acceptRes = await gameSockets[0].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toMatchObject(substitutionStates.afterAccept1)
      expect(Date.now() - update.substitution.startDate).toBeLessThan(1000)
    }
  })

  test('Should not be accepted by player 1 again', async () => {
    const acceptRes = await gameSockets[0].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be acceptedable by replaced player', async () => {
    const acceptRes = await gameSockets[2].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be rejected by player 6', async () => {
    const acceptRes = await gameSockets[5].emitWithAck(5000, 'substitution:answer', { accept: false })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be acceptedable by watching player', async () => {
    const acceptRes = await gameSockets[4].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should be accepted by player 2', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const acceptRes = await gameSockets[1].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toMatchObject(substitutionStates.afterAccept2)
      expect(Date.now() - update.substitution.startDate).toBeLessThan(1000)
    }
  })

  test('Should be accepted by player 3 and performed', async () => {
    const updateGamePromise = waitForEventOnSockets([...gameSockets.slice(0, 2), ...gameSockets.slice(3)], 'update')
    const changePlayerPromise = waitForEventOnSockets([gameSockets[4]], 'substitution:changeGamePlayer')

    const acceptRes = await gameSockets[3].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      console.log(update)
      expect(update.substitutedPlayerIndices).toStrictEqual([2])
      expect(update.substitution).toBeNull()
    }

    expect(await changePlayerPromise[0]).toBe(2)
    expect(gameSockets[2].disconnected).toBe(true)
  })
})
