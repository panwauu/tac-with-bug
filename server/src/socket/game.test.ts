import { UserWithSocket, getUsersWithSockets } from '../test/handleUserSockets'
import { registerGameSocket, initiateGameSocket } from '../test/handleGameSocket'
import { closeSockets, connectSocket } from '../test/handleSocket'
import { GameSocketC } from '../test/socket'

describe('Game test suite via socket.io', () => {
  let usersWithSockets: UserWithSocket[]
  const gameID = 1

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3, 4] })
  })

  afterAll(async () => {
    await closeSockets(usersWithSockets)
  })

  describe('Test invalid connection', () => {
    test('Test with invalid game', async () => {
      await expect(registerGameSocket('test', usersWithSockets?.[0]?.token)).rejects.toBe(undefined)
    })

    test('Test with invalid token', async () => {
      await expect(registerGameSocket(1000, 'test')).rejects.toBe(undefined)
    })
  })

  describe('Test valid connection', () => {
    let gameSocket: GameSocketC

    afterEach(async () => {
      await closeSockets([gameSocket])
    })

    test('Test with own game', async () => {
      gameSocket = await registerGameSocket(gameID, usersWithSockets[0].token)
    })

    test('Test with other tournament game', async () => {
      gameSocket = await registerGameSocket(3, usersWithSockets[0].token)
    })
  })

  describe('Test dealCards', () => {
    let gameSocket: GameSocketC, interval: NodeJS.Timer
    const gameID = 2

    afterAll(async () => {
      clearInterval(interval)
      await closeSockets([gameSocket])
    })

    test('Register player and expect dealCards', async () => {
      gameSocket = initiateGameSocket(gameID, usersWithSockets[0].token)
      let nUpdates = 0
      let updateData: any = null
      gameSocket.on('update', (data) => {
        updateData = data
        nUpdates += 1
      })

      const promiseArray = [
        gameSocket.oncePromise('game:online-players'),
        new Promise<any>(
          (resolve) =>
            (interval = setInterval(() => {
              if (nUpdates >= 2) {
                resolve(updateData)
                clearInterval(interval)
              }
            }, 20))
        ),
      ]
      await connectSocket(gameSocket)
      const result = await Promise.all(promiseArray)
      expect(result[0].onlineGamePlayers).toEqual([0])
      expect(result[0].nWatchingPlayers).toEqual(0)
      expect(result[0].watchingPlayerNames).toEqual([])
      expect(generateGameSnapshot(result[1])).toMatchSnapshot()
      expect(result[1].ownCards.length).toBeGreaterThan(0)
    })
  })

  describe('Test complete flow with all events', () => {
    let gameSocketOfPlayer2: GameSocketC, gameSocketOfPlayer3: GameSocketC

    afterAll(async () => {
      await closeSockets([gameSocketOfPlayer2, gameSocketOfPlayer3])
    })

    test('Register first player', async () => {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 500)
      })
      gameSocketOfPlayer2 = initiateGameSocket(gameID, usersWithSockets[2].token)
      const promiseArray: any = [gameSocketOfPlayer2.oncePromise('game:online-players'), gameSocketOfPlayer2.oncePromise('update')]
      await connectSocket(gameSocketOfPlayer2)
      const result = await Promise.all(promiseArray)
      expect(result[0].onlineGamePlayers).toEqual([2])
      expect(result[0].nWatchingPlayers).toEqual(0)
      expect(result[0].watchingPlayerNames).toEqual([])
      expect(generateGameSnapshot(result[1])).toMatchSnapshot()
    })

    test('Register second player', async () => {
      gameSocketOfPlayer3 = initiateGameSocket(gameID, usersWithSockets[3].token)
      const promiseArray: any[] = [
        gameSocketOfPlayer2.oncePromise('game:online-players'),
        gameSocketOfPlayer3.oncePromise('game:online-players'),
        gameSocketOfPlayer3.oncePromise('update'),
      ]
      await connectSocket(gameSocketOfPlayer3)
      const result = await Promise.all(promiseArray)
      expect(result[0].onlineGamePlayers.sort()).toEqual([2, 3].sort())
      expect(result[0].nWatchingPlayers).toEqual(0)
      expect(result[0].watchingPlayerNames).toEqual([])
      expect(result[1].onlineGamePlayers.sort()).toEqual([2, 3].sort())
      expect(result[1].nWatchingPlayers).toEqual(0)
      expect(result[1].watchingPlayerNames).toEqual([])
      expect(generateGameSnapshot(result[2])).toMatchSnapshot()
    })

    test('Post move', async () => {
      const promiseArray = [gameSocketOfPlayer2.oncePromise('update'), gameSocketOfPlayer3.oncePromise('update')]
      gameSocketOfPlayer2.emit('postMove', [2, 0, 'beenden'])
      const result = await Promise.all(promiseArray)
      expect(generateGameSnapshot(result[0])).toMatchSnapshot()
      expect(generateGameSnapshot(result[1])).toMatchSnapshot()
      const game = result[0]
      expect(game.running).toBe(false)
      expect(game.rematch_open).toBe(true)
    })

    test('Does emit onlinePlayers to gameSocket1 when gameSocket0 disconnects', async () => {
      const promiseArray = [gameSocketOfPlayer3.oncePromise('game:online-players')]
      gameSocketOfPlayer2.disconnect()
      const result = await Promise.all(promiseArray)
      expect(result[0].onlineGamePlayers).toEqual([3])
      expect(result[0].nWatchingPlayers).toEqual(0)
      expect(result[0].watchingPlayerNames).toEqual([])
    })

    test('Unregister last player', async () => {
      gameSocketOfPlayer3.disconnect()
    })

    test.todo('Test watching mode - online Players')
  })
})

function generateGameSnapshot(game: any) {
  game.lastPlayed = 0
  game.players.forEach((_: any, i: number) => (game.players[i].name = `username${i}`))
  game.statistic.forEach((_: any, i: number) => (game.statistic[i].actions.timePlayed = 0))
  return JSON.stringify(game)
}
