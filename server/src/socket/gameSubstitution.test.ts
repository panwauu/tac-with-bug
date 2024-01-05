import type { GameSocketC } from '../test/socket'
import type { Substitution } from '../sharedTypes/game'

import { UserWithSocket, getUsersWithSockets } from '../test/handleUserSockets'
import { initiateGameSocket } from '../test/handleGameSocket'
import { closeSockets, connectSocket, waitForEventOnSockets } from '../test/handleSocket'
import { sleep } from '../helpers/sleep'
import { getBotName } from '../bot/names'
import { getGame } from '../services/game'

describe('Test substitution start conditions with socket.io', () => {
  let usersWithSocket: UserWithSocket
  let gameSocket: GameSocketC
  let testCaseNumber = 0
  const testCases = [
    // [gameID, playerIndexToSubstitute, expectedStatus]
    [10, 0, 200], // During trade
    [10, 1, 200],
    [10, 2, 200],
    [10, 3, 200],
    [11, 0, 500], // During teufel
    [11, 1, 500],
    [11, 2, 200],
    [11, 3, 500],
    [12, 0, 500], // During narr
    [12, 1, 500],
    [12, 2, 200],
    [12, 3, 500],
    [4, 0, 500], // Tournament game
    [8, 0, 500], // Ended game
  ]

  beforeEach(async () => {
    usersWithSocket = (await getUsersWithSockets({ ids: [5] }))[0]
    gameSocket = initiateGameSocket(testCases[testCaseNumber][0], usersWithSocket.token)
    await connectSocket(gameSocket)
    await sleep(100)
  })

  afterEach(async () => {
    testCaseNumber += 1
    await closeSockets([gameSocket, usersWithSocket.socket])
  })

  test.each(testCases)('Substitution from game %s of the player %s should result in status %s', async (_, playerIndexToSubstitute, expectedStatus) => {
    const offerRes = await gameSocket.emitWithAck(5000, 'substitution:start', playerIndexToSubstitute, null)
    expect(offerRes.status).toBe(expectedStatus)
  })
})

describe('Test game substitution of player by player', () => {
  const substitutionStates: Record<string, Omit<Substitution, 'startDate'>> = {
    afterOffer: {
      acceptedByIndex: [],
      substitute: { userID: 5, username: 'UserE', botID: null, botUsername: null },
      playerIndexToSubstitute: 2,
    },
    afterAccept1: {
      acceptedByIndex: [0],
      substitute: { userID: 5, username: 'UserE', botID: null, botUsername: null },
      playerIndexToSubstitute: 2,
    },
    afterAccept2: {
      acceptedByIndex: [0, 1],
      substitute: { userID: 5, username: 'UserE', botID: null, botUsername: null },
      playerIndexToSubstitute: 2,
    },
  }

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

    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:start', 2, null)
    expect(offerRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toMatchObject(substitutionStates.afterOffer)
      expect(Date.now() - update.substitution.startDate).toBeLessThan(1000)
    }
  })

  test('Should not start substitution if already running', async () => {
    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:start', 2, null)
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

    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:start', 2, null)
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
      expect(update.substitutedPlayerIndices).toStrictEqual([2])
      expect(update.substitution).toBeNull()
    }

    expect(await changePlayerPromise[0]).toBe(2)
    expect(gameSockets[2].disconnected).toBe(true)

    const onlinePlayersPromise = waitForEventOnSockets([...gameSockets.slice(0, 2), ...gameSockets.slice(3)], 'game:online-players')
    const onlinePlayers = await Promise.all(onlinePlayersPromise)
    for (const onlinePlayer of onlinePlayers) {
      expect(onlinePlayer.onlineGamePlayers).toEqual(expect.arrayContaining([0, 1, 2, 3]))
      expect(onlinePlayer.nWatchingPlayers).toEqual(1)
      expect(onlinePlayer.watchingPlayerNames).toEqual(expect.arrayContaining(['UserF']))
    }
  })
})

describe('Test game substitution of player by bot', () => {
  const gameID = 2
  const substitutionStates: Record<string, Omit<Substitution, 'startDate'>> = {
    afterStart: {
      acceptedByIndex: [0],
      substitute: { userID: null, username: null, botID: 3, botUsername: getBotName(gameID, 2) },
      playerIndexToSubstitute: 2,
    },
    afterAccept2: {
      acceptedByIndex: [0, 1],
      substitute: { userID: null, username: null, botID: 3, botUsername: getBotName(gameID, 2) },
      playerIndexToSubstitute: 2,
    },
  }

  let usersWithSockets: UserWithSocket[]
  const gameSockets: GameSocketC[] = []

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3, 4] })
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

    const offerRes = await gameSockets[0].emitWithAck(5000, 'substitution:start', 2, 3)
    console.log(offerRes)
    expect(offerRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toMatchObject(substitutionStates.afterStart)
      expect(Date.now() - update.substitution.startDate).toBeLessThan(1000)
    }
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

    const acceptRes = await gameSockets[3].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([2])
      expect(update.substitution).toBeNull()
    }

    expect(gameSockets[2].disconnected).toBe(true)

    const onlinePlayersPromise = waitForEventOnSockets([...gameSockets.slice(0, 2), ...gameSockets.slice(3)], 'game:online-players')
    const onlinePlayers = await Promise.all(onlinePlayersPromise)
    for (const onlinePlayer of onlinePlayers) {
      expect(onlinePlayer.onlineGamePlayers).toEqual(expect.arrayContaining([0, 1, 3]))
    }

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.bots).toEqual([null, null, 3, null, null, null])
    expect(game.playerIDs).toEqual([1, 2, null, 4, 3])
    expect(game.game.statistic.length).toBe(5)
  })
})

describe('Test game substitution of bot by player', () => {
  const gameID = 13
  const substitutionStates: Record<string, Omit<Substitution, 'startDate'>> = {
    afterStart: {
      acceptedByIndex: [],
      substitute: { userID: 3, username: 'UserC', botID: null, botUsername: null },
      playerIndexToSubstitute: 2,
    },
    afterAccept1: {
      acceptedByIndex: [0],
      substitute: { userID: 3, username: 'UserC', botID: null, botUsername: null },
      playerIndexToSubstitute: 2,
    },
  }

  let usersWithSockets: UserWithSocket[]
  const gameSockets: GameSocketC[] = []

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3] })
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

    const offerRes = await gameSockets[2].emitWithAck(5000, 'substitution:start', 2, null)
    expect(offerRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toMatchObject(substitutionStates.afterStart)
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

  test('Should be accepted by player2 and performed', async () => {
    const updateGamePromise = waitForEventOnSockets(gameSockets, 'update')
    const changePlayerPromise = waitForEventOnSockets([gameSockets[2]], 'substitution:changeGamePlayer')

    const acceptRes = await gameSockets[1].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([])
      expect(update.substitution).toBeNull()
    }

    expect(await changePlayerPromise[0]).toBe(2)

    const onlinePlayersPromise = waitForEventOnSockets([...gameSockets.slice(0, 2), ...gameSockets.slice(3)], 'game:online-players')
    const onlinePlayers = await Promise.all(onlinePlayersPromise)
    for (const onlinePlayer of onlinePlayers) {
      expect(onlinePlayer.onlineGamePlayers).toEqual(expect.arrayContaining([0, 1, 2]))
    }

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.bots).toEqual([null, null, null, 3, null, null])
    expect(game.playerIDs).toEqual([1, 2, 3, null])
    expect(game.game.statistic.length).toBe(4)
  })
})
