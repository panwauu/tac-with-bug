import type { GameSocketC } from '../test/socket'
import type { Replacement } from '../sharedTypes/game'

import { UserWithSocket, getUsersWithSockets } from '../test/handleUserSockets'
import { initiateGameSocket } from '../test/handleGameSocket'
import { closeSockets, connectSocket, waitForEventOnSockets } from '../test/handleSocket'
import { sleep } from '../helpers/sleep'

const replacementStates: Record<string, Omit<Replacement, 'startDate'>> = {
  afterOffer: {
    acceptedByIndex: [],
    rejectedByIndex: [],
    replacementUserID: 5,
    replacementUsername: 'UserE',
    playerIndexToReplace: 2,
  },
  afterAccept1: {
    acceptedByIndex: [1],
    rejectedByIndex: [],
    replacementUserID: 5,
    replacementUsername: 'UserE',
    playerIndexToReplace: 2,
  },
  afterAccept2: {
    acceptedByIndex: [1, 2],
    rejectedByIndex: [],
    replacementUserID: 5,
    replacementUsername: 'UserE',
    playerIndexToReplace: 2,
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

  test.todo('Test offer conditions - bspw. not running game, ...')

  test('Should start replacement sucessfully', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const offerRes = await gameSockets[4].emitWithAck(5000, 'replacement:offer')
    expect(offerRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.replacedPlayerIndices).toStrictEqual([])
      expect(update.replacement).toMatchObject(replacementStates.afterOffer)
      expect(Date.now() - update.replacement.startDate).toBeLessThan(1000)
    }
  })

  test('Should not start replacement if already running', async () => {
    const offerRes = await gameSockets[4].emitWithAck(5000, 'replacement:offer')
    expect(offerRes.status).toBe(500)
  })

  test('Should stop if rejected', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const rejectRes = await gameSockets[0].emitWithAck(5000, 'replacement:answer', { accept: false })
    expect(rejectRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.replacedPlayerIndices).toStrictEqual([])
      expect(update.replacement).toMatchObject(replacementStates.afterReject)
      expect(Date.now() - update.replacement.startDate).toBeLessThan(1000)
    }
  })

  test('Should not be accepted by player 1 if was rejected', async () => {
    const acceptRes = await gameSockets[0].emitWithAck(5000, 'replacement:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be rejected by player 1 if was rejected', async () => {
    const acceptRes = await gameSockets[0].emitWithAck(5000, 'replacement:answer', { accept: false })
    expect(acceptRes.status).toBe(500)
  })

  test('Should start replacement sucessfully again', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const offerRes = await gameSockets[4].emitWithAck(5000, 'replacement:offer')
    expect(offerRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.replacedPlayerIndices).toStrictEqual([])
      expect(update.replacement).toMatchObject(replacementStates.afterOffer)
      expect(Date.now() - update.replacement.startDate).toBeLessThan(1000)
    }
  })

  test('Should be accepted by player 1', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const acceptRes = await gameSockets[0].emitWithAck(5000, 'replacement:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.replacedPlayerIndices).toStrictEqual([])
      expect(update.replacement).toMatchObject(replacementStates.afterAccept1)
      expect(Date.now() - update.replacement.startDate).toBeLessThan(1000)
    }
  })

  test('Should not be accepted by player 1 again', async () => {
    const acceptRes = await gameSockets[0].emitWithAck(5000, 'replacement:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be acceptedable by replaced player', async () => {
    const acceptRes = await gameSockets[2].emitWithAck(5000, 'replacement:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be rejected by player 6', async () => {
    const acceptRes = await gameSockets[5].emitWithAck(5000, 'replacement:answer', { accept: false })
    expect(acceptRes.status).toBe(500)
  })

  test('Should not be acceptedable by watching player', async () => {
    const acceptRes = await gameSockets[4].emitWithAck(5000, 'replacement:answer', { accept: true })
    expect(acceptRes.status).toBe(500)
  })

  test('Should be accepted by player 2', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')

    const acceptRes = await gameSockets[1].emitWithAck(5000, 'replacement:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.replacedPlayerIndices).toStrictEqual([])
      expect(update.replacement).toMatchObject(replacementStates.afterAccept2)
      expect(Date.now() - update.replacement.startDate).toBeLessThan(1000)
    }
  })

  test('Should be accepted by player 3 and performed', async () => {
    const updateGamePromise = waitForEventOnSockets([...gameSockets.slice(0, 2), ...gameSockets.slice(3)], 'update')
    const changePlayerPromise = waitForEventOnSockets([gameSockets[4]], 'replacement:changeGamePlayer')

    const acceptRes = await gameSockets[3].emitWithAck(5000, 'replacement:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.replacedPlayerIndices).toStrictEqual([2])
      expect(update.replacement).toMatchObject(replacementStates.afterAccept3)
    }

    expect(await changePlayerPromise[0]).toBe(2)
    expect(gameSockets[2].disconnected).toBe(true)
  })
})
