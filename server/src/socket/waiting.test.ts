import { registerGameSocket } from '../test/handleGameSocket'
import Chance from 'chance'
import { Result } from '../sharedTypes/GeneralNamespaceDefinition'
import { disableRematchOfOldGames, getGame } from '../services/game'
import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets, connectSocket } from '../test/handleSocket'
import { GameSocketC, GeneralSocketC } from '../test/socket'
const chance = new Chance()

describe('Waiting game test suite via Socket.io', () => {
  describe('Test with one users', () => {
    let waitingGameID: number, usersWithSockets: UserWithSocket[]

    beforeAll(async () => {
      usersWithSockets = await getUsersWithSockets({ n: 1 })
      await testServer.pgPool.query('UPDATE users SET freelicense=true WHERE id = $1;', [usersWithSockets[0].id])
    })

    afterAll(async () => {
      await testServer.pgPool.query('DELETE FROM waitinggames;')
      await closeSockets(usersWithSockets)
    })

    test('Test get games - should be Empty at beginning', async () => {
      const promise = usersWithSockets[0].socket.oncePromise('waiting:getGames')
      usersWithSockets[0].socket.emit('waiting:getGames')
      const data = await promise
      expect(data).toStrictEqual([])
    })

    test('Should not create waiting game with missing data', async () => {
      const resWithoutPlayers = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:createGame', { nTeams: 2, meister: true, private: false } as any)
      expect(resWithoutPlayers.status).toBe(500)

      const resWithoutTeams = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:createGame', { nPlayers: 4, meister: true, private: false } as any)
      expect(resWithoutTeams.status).toBe(500)

      const resWithoutMeister = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:createGame', { nPlayers: 4, nTeams: 2, private: false } as any)
      expect(resWithoutMeister.status).toBe(500)

      const resWithoutPrivate = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:createGame', { nPlayers: 4, nTeams: 2, meister: true } as any)
      expect(resWithoutPrivate.status).toBe(500)
    })

    test('Should create waiting game', async () => {
      const nPlayers = chance.pickone([4, 6])
      const gameData = {
        nPlayers: nPlayers,
        nTeams: chance.pickone(nPlayers === 4 ? [1, 2] : [1, 2, 3]),
        meister: chance.bool(),
        private: chance.bool(),
      }

      const dataPromise = usersWithSockets[0].socket.oncePromise('waiting:getGames')
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:createGame', gameData)
      expect(res.status).toBe(200)

      const game = (await dataPromise)[0]
      expect(game).not.toBeUndefined()
      expect(game.gameid).toBe(null)
      expect(game.nPlayers).toBe(gameData.nPlayers)
      expect(game.nTeams).toBe(gameData.nTeams)
      expect(game.meister).toBe(gameData.meister)
      expect(game.private).toBe(gameData.private)
      expect(game.admin).toBe(usersWithSockets[0].username)
      expect(game.adminID).toBe(usersWithSockets[0].id)
      expect(game.playerIDs[0]).toBeGreaterThan(0)
      expect(game.playerIDs.splice(1, 6).every((p: any) => p === null)).toBe(true)
      expect(game.players[0]).toBe(usersWithSockets[0].username)
      expect(game.players.splice(1, 6).every((p: any) => p === null)).toBe(true)
      expect(typeof game.balls[0]).toBe('string')
      expect(game.balls.splice(1, 6).every((p: any) => p === null)).toBe(true)
      expect(game.ready.every((r: any) => r === false)).toBe(true)
      waitingGameID = game.id
    })

    test('Should not switch color with invalid data', async () => {
      const resWrongColor = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:switchColor', { gameID: waitingGameID, username: usersWithSockets[0].username, color: 'a' })
      expect(resWrongColor.status).toBe(500)
      const sameColor = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:switchColor', { gameID: waitingGameID, username: usersWithSockets[0].username, color: 'red' })
      expect(sameColor.status).toBe(500)
      const resInvalidUser = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:switchColor', { gameID: waitingGameID, username: 'a', color: 'blue' })
      expect(resInvalidUser.status).toBe(500)
    })

    test('Should not switch color with incomplete data', async () => {
      const noGameId = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:switchColor', { username: usersWithSockets[0].username, color: 'red' } as any)
      expect(noGameId.status).toBe(500)
      const noUser = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:switchColor', { gameID: waitingGameID, color: 'blue' } as any)
      expect(noUser.status).toBe(500)
      const noColor = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:switchColor', { gameID: waitingGameID, username: usersWithSockets[0].username } as any)
      expect(noColor.status).toBe(500)
    })

    test('Should switch color', async () => {
      const switching = { gameID: waitingGameID, username: usersWithSockets[0].username, color: 'blue' }
      const promise = usersWithSockets[0].socket.oncePromise('waiting:getGames')
      await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:switchColor', switching)
      const game = (await promise)[0]
      expect(game.balls[0]).toBe('blue')
    })

    test('Should not move player with incomplete data', async () => {
      const resWithoutGameId = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', { username: usersWithSockets[0].username, steps: 1 } as any)
      expect(resWithoutGameId.status).toBe(500)
      const resNegativeGameId = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', { gameID: -1, username: usersWithSockets[0].username, steps: 1 } as any)
      expect(resNegativeGameId.status).toBe(500)
      const resWithoutUsername = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', { gameID: waitingGameID, steps: 1 } as any)
      expect(resWithoutUsername.status).toBe(500)
      const resWithoutSteps = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', { gameID: waitingGameID, username: usersWithSockets[0].username } as any)
      expect(resWithoutSteps.status).toBe(500)
    })

    test('Should not move player with invalid data', async () => {
      const resInvalidGame = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', { gameID: 1000000, username: usersWithSockets[0].username, steps: 1 })
      expect(resInvalidGame.status).toBe(500)
      const resInvalidUser = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', { gameID: waitingGameID, username: 'a', steps: 1 })
      expect(resInvalidUser.status).toBe(500)
      const resWrongDir = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', { gameID: waitingGameID, username: usersWithSockets[0].username, steps: -1 })
      expect(resWrongDir.status).toBe(500)
    })

    test('Should move player', async () => {
      const move = { gameID: waitingGameID, username: usersWithSockets[0].username, steps: 1 }

      const promise = usersWithSockets[0].socket.oncePromise('waiting:getGames')
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:movePlayer', move)
      expect(res.status).toBe(200)
      const game = (await promise)[0]
      expect(game).not.toBeUndefined()
      expect(game.gameid).toBe(null)
      expect(game.admin).toBe(usersWithSockets[0].username)
      expect(game.playerIDs[1]).toBeGreaterThan(0)
      expect([game.playerIDs[0], ...game.playerIDs.splice(2, 6)].every((p) => p === null)).toBe(true)
      expect(game.players[1]).toBe(usersWithSockets[0].username)
      expect([game.players[0], ...game.players.splice(2, 6)].every((p) => p === null)).toBe(true)
      expect(typeof game.balls[1]).toBe('string')
      expect([game.balls[0], ...game.balls.splice(2, 6)].every((p) => p === null)).toBe(true)
      expect(game.ready.every((r: any) => r === false)).toBe(true)
    })

    test('Should not remove player without or wrong username', async () => {
      const resWithoutUser = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:removePlayer', undefined as any)
      expect(resWithoutUser.status).toBe(500)
      const resInvalidUser = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:removePlayer', 'a')
      expect(resInvalidUser.status).toBe(500)
    })

    test('Should remove player', async () => {
      const promise = usersWithSockets[0].socket.oncePromise('waiting:getGames')
      usersWithSockets[0].socket.emitWithAck(5000, 'waiting:removePlayer', usersWithSockets[0].username)
      expect(await promise).toStrictEqual([])
    })
  })

  describe('Test with multiple users', () => {
    let waitingGameID: number, usersWithSockets: UserWithSocket[], gameID: number

    beforeAll(async () => {
      usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3, 4, 5] })
    })

    afterAll(async () => {
      await testServer.pgPool.query('DELETE FROM waitinggames;')
      await closeSockets(usersWithSockets)
    })

    test('Create Game', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:createGame', { nPlayers: 4, nTeams: 2, meister: true, private: false })
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.id).toBeGreaterThan(0)
        expect(game.players[0]).toBe(usersWithSockets[0].username)
        waitingGameID = game.id
      })
    })

    test('Should not add second player for invalid data', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:joinGame', undefined as any)
      expect(res.status).toBe(500)
      const resInvalidID = await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:joinGame', 1000000)
      expect(resInvalidID.status).toBe(500)
    })

    test('Second player should join waiting game', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:joinGame', waitingGameID)
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.players[1]).toBe(usersWithSockets[1].username)
      })
    })

    test('Non-admin should not be able to change other color', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:switchColor', { gameID: waitingGameID, username: usersWithSockets[0].username, color: 'green' })
      expect(res.status).toBe(500)
    })

    test('Non-admin should not be able to remove player 2', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:removePlayer', usersWithSockets[0].username)
      expect(res.status).toBe(500)
    })

    test('Admin should be able to remove player 2', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:removePlayer', usersWithSockets[1].username)
      expect(res.status).toBe(200)
      return Promise.all(promiseArray).then((val) => {
        expect(val[0][0].players[1]).toBeNull()
      })
    })

    test('Second player should join waiting game', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:joinGame', waitingGameID)
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.players[1]).toBe(usersWithSockets[1].username)
      })
    })

    test('Third player should join waiting game', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      const res = await usersWithSockets[2].socket.emitWithAck(5000, 'waiting:joinGame', waitingGameID)
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.players[2]).toBe(usersWithSockets[2].username)
      })
    })

    test('Should not ready first player if not full', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: waitingGameID })
      expect(res.status).toBe(500)
    })

    test('Join last player', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      const res = await usersWithSockets[3].socket.emitWithAck(5000, 'waiting:joinGame', waitingGameID)
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.players[3]).toBe(usersWithSockets[3].username)
      })
    })

    test('Should not add player if already full', async () => {
      const res = await usersWithSockets[4].socket.emitWithAck(5000, 'waiting:joinGame', waitingGameID)
      expect(res.status).toBe(500)
    })

    test('Should not ready first player with invalid data', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: 1000000 })
      expect(res.status).toBe(500)
      const resNotInGame = await usersWithSockets[4].socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: waitingGameID })
      expect(resNotInGame.status).toBe(500)
    })

    test('Ready first player', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      await usersWithSockets[0].socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: waitingGameID })

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.ready[0]).toBe(true)
      })
    })

    test('Ready second player', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: waitingGameID })

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.ready[1]).toBe(true)
      })
    })

    test('Ready third player', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      await usersWithSockets[2].socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: waitingGameID })

      return Promise.all(promiseArray).then((val: any) => {
        const game = val[0][0]
        expect(game.ready[2]).toBe(true)
      })
    })

    test('Ready last player', async () => {
      const pGetGames = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })
      const pStartGame = usersWithSockets
        .filter((_, i) => i < 4)
        .map((uWS) => {
          return uWS.socket.oncePromise('waiting:startGame')
        })

      const res = await usersWithSockets[3].socket.emitWithAck(5000, 'waiting:readyPlayer', { gameID: waitingGameID })
      expect(res.status).toBe(200)

      const gamesRes = await Promise.all(pGetGames)
      const startRes = await Promise.all(pStartGame)
      expect(gamesRes[0].length).toBe(0)
      expect(startRes[0].gamePlayer).toBe(0)
      expect(startRes[1].gamePlayer).toBe(2)
      expect(startRes[2].gamePlayer).toBe(1)
      expect(startRes[3].gamePlayer).toBe(3)
      expect(startRes[0].gameID).toBeGreaterThan(0)

      const game = await getGame(testServer.pgPool, startRes[0].gameID)
      expect(game.players.sort()).toEqual(
        usersWithSockets
          .filter((_, i) => i < 4)
          .map((uws) => uws.username)
          .sort()
      )
      expect(game.playerIDs.sort()).toEqual(
        usersWithSockets
          .filter((_, i) => i < 4)
          .map((uws) => uws.id)
          .sort()
      )
      expect(game.running).toBe(true)
      expect(game.rematch_open).toBe(false)
      gameID = game.id
    })

    test('Abort of game should be auth secured', async () => {
      const res = await testAgent.delete('/gameApi/abortGame/')
      expect(res.status).toBe(401)
    })

    test('Abort of game should not be possible for another game', async () => {
      const res = await testAgent.delete('/gameApi/abortGame/').set({ Authorization: usersWithSockets[0].authHeader }).send({ gameID: 1 })
      expect(res.status).toBe(403)
    })

    test('Abort of game should not be possible for tournament game', async () => {
      await testServer.pgPool.query('UPDATE games SET created = current_timestamp, public_tournament_id = 1 WHERE id=$1;', [gameID])
      const res = await testAgent.delete('/gameApi/abortGame/').set({ Authorization: usersWithSockets[0].authHeader }).send({ gameID: gameID })
      expect(res.body).toContain('tournament')
      expect(res.status).toBe(403)
    })

    test('Abort of game should not be possible for game older 5 minutes', async () => {
      await testServer.pgPool.query("UPDATE games SET created = current_timestamp - interval'6 minutes', public_tournament_id = NULL WHERE id=$1;", [gameID])
      const res = await testAgent.delete('/gameApi/abortGame/').set({ Authorization: usersWithSockets[0].authHeader }).send({ gameID: gameID })
      expect(res.status).toBe(403)
    })

    test('Abort of game should be possible for own game', async () => {
      await testServer.pgPool.query('UPDATE games SET created = current_timestamp, public_tournament_id = NULL WHERE id=$1;', [gameID])
      const res = await testAgent.delete('/gameApi/abortGame/').set({ Authorization: usersWithSockets[0].authHeader }).send({ gameID: gameID })
      expect(res.status).toBe(204)

      const gameStatus = await testServer.pgPool.query('SELECT * FROM games WHERE id=$1;', [gameID])
      expect(gameStatus.rows[0].running).toBe(false)
      expect(gameStatus.rows[0].game.gameEnded).toBe(false)
    })
  })

  describe('Test Rematch mode', () => {
    let usersWithSockets: UserWithSocket[], gameSocket: GameSocketC
    const gameID = 1

    beforeAll(async () => {
      usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3, 4] })
      await testServer.pgPool.query('UPDATE games SET lastplayed=current_timestamp, rematch_open=true WHERE id = $1;', [gameID])
      gameSocket = await registerGameSocket(gameID, usersWithSockets[0].token)
    })

    afterAll(async () => {
      await testServer.pgPool.query('DELETE FROM waitinggames;')
      await closeSockets([gameSocket, ...usersWithSockets])
    })

    test('Unable to rematch if one player is already in a waiting room', async () => {
      await testServer.pgPool.query('UPDATE games SET rematch_open=true WHERE id = $1;', [gameID])

      const waitForUserInGame = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'waiting:createGame', { nPlayers: 4, nTeams: 2, meister: true, private: false })
      expect(res.status).toBe(200)
      const waitForUserInGameRes = await Promise.all(waitForUserInGame)
      expect(waitForUserInGameRes[0].length).toEqual(1)

      const waitForGameUpdate = gameSocket.oncePromise('update')
      const error = await new Promise<Result<null, any>>((resolve) =>
        usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => {
          resolve(data)
        })
      )
      expect(error.ok === false ? error.error : '').toEqual('PLAYER_ALREADY_IN_WAITING_GAME')

      const game = await waitForGameUpdate
      expect(game.rematch_open).toBe(false)

      const waitForLeaveGame = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })
      usersWithSockets[1].socket.emitWithAck(5000, 'waiting:removePlayer', usersWithSockets[1].username)
      const waitForLeaveGameRes = await Promise.all(waitForLeaveGame)
      expect(waitForLeaveGameRes[0].length).toEqual(0)
    })

    test('Unable to rematch if one player is not online', async () => {
      await testServer.pgPool.query('UPDATE games SET rematch_open=true WHERE id = $1;', [gameID])

      const waitForGameUpdate = gameSocket.oncePromise('update')
      await closeSockets([usersWithSockets[1]])

      const error = await new Promise<Result<null, any>>((resolve) =>
        usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => {
          resolve(data)
        })
      )
      expect(error.ok === false ? error.error : '').toEqual('PLAYER_NOT_ONLINE')

      const game = await waitForGameUpdate
      expect(game.rematch_open).toBe(false)

      await connectSocket(usersWithSockets[1].socket)
    })

    test('Rematch should be created', async () => {
      await testServer.pgPool.query('UPDATE games SET rematch_open=true WHERE id = $1;', [gameID])

      const promises = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })

      const result = await new Promise<Result<null, any>>((resolve) =>
        usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => {
          resolve(data)
        })
      )
      expect(result.ok).toBe(true)

      const res = await Promise.all(promises)
      expect(res[0].length).toBe(1)
      expect(res[0][0].admin).toEqual(usersWithSockets[0].username)
      expect(res[0][0].ready.some((r: boolean) => r)).toEqual(false)
      expect(res[0][0].players).toContain(usersWithSockets[0].username)
      expect(res[0][0].players).toContain(usersWithSockets[1].username)

      const dbRes = await testServer.pgPool.query('SELECT rematch_open FROM games WHERE id=$1;', [gameID])
      expect(dbRes.rows[0].rematch_open).toBe(false)
    })

    test('Rematch should be destroyed if one leaves the room', async () => {
      const waitForLeaveGame = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('waiting:getGames')
      })
      usersWithSockets[1].socket.emitWithAck(5000, 'waiting:removePlayer', usersWithSockets[1].username)
      const waitForLeaveGameRes = await Promise.all(waitForLeaveGame)
      expect(waitForLeaveGameRes[0].length).toEqual(0)
    })

    test('Rematch should not be created if rematch_open is false', async () => {
      const error = await new Promise<Result<null, any>>((resolve) =>
        usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => {
          resolve(data)
        })
      )
      expect(error.ok === false ? error.error : '').toEqual('REMATCH_NOT_OPEN')
    })

    test('Should not end rematch if game is new', async () => {
      await testServer.pgPool.query('UPDATE games SET lastplayed=current_timestamp, rematch_open=true WHERE id=$1;', [gameID])
      const ids = await disableRematchOfOldGames(testServer.pgPool)
      expect(ids).not.toContain(gameID)
    })
    test('Should end rematch if game is new', async () => {
      await testServer.pgPool.query("UPDATE games SET lastplayed=current_timestamp - interval '5 minutes', rematch_open=true WHERE id=$1;", [gameID])
      const ids = await disableRematchOfOldGames(testServer.pgPool)
      expect(ids).toContain(gameID)
    })
  })

  describe('Test socket authentication', () => {
    let unauthSocket: GeneralSocketC

    beforeAll(async () => {
      unauthSocket = await getUnauthenticatedSocket()
    })

    afterAll(async () => {
      await closeSockets([unauthSocket])
    })

    test.each(['waiting:joinGame', 'waiting:createGame', 'waiting:movePlayer', 'waiting:removePlayer', 'waiting:readyPlayer', 'waiting:switchColor', 'waiting:createRematch'])(
      'should not allow %s',
      async (eventname: any) => {
        const res = (await unauthSocket.emitWithAck(5000, eventname, 0)) as any
        expect(res.error).toBe('UNAUTH')
      }
    )
  })
})
