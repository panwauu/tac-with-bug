import type { GameSocketC } from '../test/socket'
import type { GameStatistic, Substitution } from '@repo/core/types'

import { UserWithSocket, getUsersWithSockets } from '../test/handleUserSockets'
import { initiateGameSocket } from '../test/handleGameSocket'
import { closeSockets, connectSocket, waitForEventOnSockets } from '../test/handleSocket'
import { sleep } from '../helpers/sleep'
import { getBotName } from '@repo/core/bot/names'
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
    await sleep(1000)
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
    const runningGamesPromise = waitForEventOnSockets(
      usersWithSockets.map((uWS) => uWS.socket),
      'games:getRunningGames'
    )

    const acceptRes = await gameSockets[3].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptRes.status).toBe(200)

    const updateData = await Promise.all(updateGamePromise)
    for (const update of updateData) {
      expect(update.substitutedPlayerIndices).toStrictEqual([2])
      expect(update.substitution).toBeNull()
    }

    expect(await changePlayerPromise[0]).toBe(2)

    // Everyone gets the list of running games again, with the substitute in the game
    const runningGamesData = await Promise.all(runningGamesPromise)
    for (const runningGames of runningGamesData) {
      const players = runningGames.find((g: { id: number }) => g.id === gameID)?.teams.flat()
      expect(players).toContain('UserE')
      expect(players).not.toContain('UserC')
    }

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
      expect(update.substitutedPlayerIndices).toStrictEqual([2])
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
    expect(game.game.statistic.length).toBe(5)
  })
})

describe('Test game substitution of bot by the replaced player', () => {
  // The 'player by bot' describe above leaves game 2 with bot 3 on seat 2 and the replaced
  // player 3 keeping his users_to_games entry at index 4, i.e. outside of the actual seats.
  const gameID = 2
  let usersWithSockets: UserWithSocket[]
  const gameSockets: GameSocketC[] = []
  let statisticOfReplacedPlayer: GameStatistic
  let statisticOfBot: GameStatistic

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 4, 3] })
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

  test('Replaced player should watch the game without occupying a seat', async () => {
    const game = await getGame(testServer.pgPool, gameID)
    expect(game.playerIDs).toEqual([1, 2, null, 4, 3])
    expect(game.bots[2]).toBe(3)
    expect(game.game.substitutedPlayerIndices).toEqual([2])
    expect(game.game.statistic.length).toBe(5)
    statisticOfReplacedPlayer = game.game.statistic[4]
    statisticOfBot = game.game.statistic[2]
  })

  test('Replaced player should be able to offer to take his old seat back', async () => {
    const offerRes = await gameSockets[3].emitWithAck(5000, 'substitution:start', 2, null)
    expect(offerRes.status).toBe(200)

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.substitution).toMatchObject({
      acceptedByIndex: [],
      substitute: { userID: 3, username: 'UserC', botID: null, botUsername: null },
      playerIndexToSubstitute: 2,
    })
  })

  test('Should still require the acceptance of every seated player', async () => {
    const acceptResPlayer1 = await gameSockets[0].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptResPlayer1.status).toBe(200)
    const acceptResPlayer2 = await gameSockets[1].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptResPlayer2.status).toBe(200)

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.substitution).toMatchObject({ acceptedByIndex: [0, 1], playerIndexToSubstitute: 2 })
    expect(game.playerIDs).toEqual([1, 2, null, 4, 3])
  })

  test('Should be performed when the last seated player accepts', async () => {
    const changePlayerPromise = waitForEventOnSockets([gameSockets[3]], 'substitution:changeGamePlayer')

    const acceptResPlayer4 = await gameSockets[2].emitWithAck(5000, 'substitution:answer', { accept: true })
    expect(acceptResPlayer4.status).toBe(200)

    expect(await changePlayerPromise[0]).toBe(2)

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.substitution).toBeNull()
    expect(game.bots).toEqual([null, null, null, null, null, null])
    // The stale entry at index 4 is gone - playerIDs holds the seats only
    expect(game.playerIDs).toEqual([1, 2, 3, 4])
  })

  test('Should continue the statistic of the returned player and archive the one of the bot', async () => {
    const game = await getGame(testServer.pgPool, gameID)
    // No additional statistic entry - the returned player resumes his own one on his seat
    expect(game.game.statistic.length).toBe(5)
    expect(game.game.substitutedPlayerIndices).toEqual([2])
    expect(game.game.statistic[2]).toEqual(statisticOfReplacedPlayer)
    expect(game.game.statistic[4]).toEqual(statisticOfBot)
  })
})

describe('Test game substitution of a replaced player on another seat', () => {
  // Game 10 is in the trade phase, so every seat can be substituted
  const gameID = 10
  // The seats of game 10 are held by the users 1, 3, 2 and 4
  let usersWithSockets: UserWithSocket[]
  const gameSockets: GameSocketC[] = []
  let returningGameSocket: GameSocketC
  let returningGameSocketOfSeat1: GameSocketC
  let statisticOfSeat0: GameStatistic
  let statisticOfSeat1: GameStatistic

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3, 4, 5] })
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
    await closeSockets([...gameSockets, returningGameSocket, returningGameSocketOfSeat1, ...usersWithSockets.map((uWS) => uWS.socket)])
  })

  test('Should substitute the player on seat 0 by a new player', async () => {
    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:start', 0, null)
    expect(offerRes.status).toBe(200)

    for (const seatSocket of [gameSockets[2], gameSockets[1], gameSockets[3]]) {
      const acceptRes = await seatSocket.emitWithAck(5000, 'substitution:answer', { accept: true })
      expect(acceptRes.status).toBe(200)
    }

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.playerIDs).toEqual([5, 3, 2, 4, 1])
    expect(game.game.substitutedPlayerIndices).toEqual([0])
    expect(game.game.statistic.length).toBe(5)
    statisticOfSeat0 = game.game.statistic[4]
    statisticOfSeat1 = game.game.statistic[1]
  })

  test('Replaced player should be able to offer to take another seat', async () => {
    // The performed substitution counts as activity - reset it to allow the next substitution
    await testServer.pgPool.query("UPDATE games SET lastplayed = current_timestamp - interval '1 hour' WHERE id = $1;", [gameID])

    returningGameSocket = initiateGameSocket(gameID, usersWithSockets[0].token)
    await connectSocket(returningGameSocket)
    await sleep(1000)

    const offerRes = await returningGameSocket.emitWithAck(5000, 'substitution:start', 1, null)
    expect(offerRes.status).toBe(200)

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.substitution).toMatchObject({
      acceptedByIndex: [],
      substitute: { userID: 1, username: 'UserA', botID: null, botUsername: null },
      playerIndexToSubstitute: 1,
    })
  })

  test('Should be performed when all seated players accept', async () => {
    const changePlayerPromise = waitForEventOnSockets([returningGameSocket], 'substitution:changeGamePlayer')

    for (const seatSocket of [gameSockets[4], gameSockets[1], gameSockets[3]]) {
      const acceptRes = await seatSocket.emitWithAck(5000, 'substitution:answer', { accept: true })
      expect(acceptRes.status).toBe(200)
    }

    expect(await changePlayerPromise[0]).toBe(1)

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.substitution).toBeNull()
    // The returning player took seat 1, the player of seat 1 took over his archived entry
    expect(game.playerIDs).toEqual([5, 1, 2, 4, 3])
  })

  test('Should take the statistic of the returning player to his new seat', async () => {
    const game = await getGame(testServer.pgPool, gameID)
    // No additional statistic entry - the returning player reuses his archived slot for the seat he took over
    expect(game.game.statistic.length).toBe(5)
    expect(game.game.substitutedPlayerIndices).toEqual([1])
    expect(game.game.statistic[1]).toEqual(statisticOfSeat0)
    expect(game.game.statistic[4]).toEqual(statisticOfSeat1)
  })

  test('Should replace the player on seat 2 by a bot', async () => {
    await testServer.pgPool.query("UPDATE games SET lastplayed = current_timestamp - interval '1 hour' WHERE id = $1;", [gameID])

    // Seat 0 is held by user 5, seat 1 by the returned user 1, seat 2 by user 2 and seat 3 by user 4
    const offerRes = await gameSockets[4].emitWithAck(5000, 'substitution:start', 2, 3)
    expect(offerRes.status).toBe(200)

    for (const seatSocket of [returningGameSocket, gameSockets[3]]) {
      const acceptRes = await seatSocket.emitWithAck(5000, 'substitution:answer', { accept: true })
      expect(acceptRes.status).toBe(200)
    }

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.bots[2]).toBe(3)
    expect(game.playerIDs).toEqual([5, 1, null, 4, 3, 2])
    expect(game.game.substitutedPlayerIndices).toEqual([1, 2])
    expect(game.game.statistic.length).toBe(6)
  })

  test('Replaced player should be able to take a bot seat and resume his statistic there', async () => {
    returningGameSocketOfSeat1 = initiateGameSocket(gameID, usersWithSockets[2].token)
    await connectSocket(returningGameSocketOfSeat1)
    await sleep(1000)

    // No inactivity is required to replace a bot
    const offerRes = await returningGameSocketOfSeat1.emitWithAck(5000, 'substitution:start', 2, null)
    expect(offerRes.status).toBe(200)

    const changePlayerPromise = waitForEventOnSockets([returningGameSocketOfSeat1], 'substitution:changeGamePlayer')
    for (const seatSocket of [gameSockets[4], returningGameSocket, gameSockets[3]]) {
      const acceptRes = await seatSocket.emitWithAck(5000, 'substitution:answer', { accept: true })
      expect(acceptRes.status).toBe(200)
    }
    expect(await changePlayerPromise[0]).toBe(2)

    const game = await getGame(testServer.pgPool, gameID)
    expect(game.bots).toEqual([null, null, null, null, null, null])
    expect(game.playerIDs).toEqual([5, 1, 3, 4, null, 2])
    // His archived slot is now used for the statistic of the bot and belongs to seat 2
    expect(game.game.substitutedPlayerIndices).toEqual([2, 2])
    expect(game.game.statistic.length).toBe(6)
    expect(game.game.statistic[2]).toEqual(statisticOfSeat1)
  })
})
