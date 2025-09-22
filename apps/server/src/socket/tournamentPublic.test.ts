import * as mail from '../communicationUtils/email'
import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { getGame } from '../services/game'
import { getPublicTournamentByID, startTournament, startTournamentRound, checkForceGameEnd, updateTournamentFromGame } from '../services/tournamentsPublic'
import { startSignUpOnCondition, endSignUpOnCondition } from '../services/tournamentsRegister'
import { getDifferentName } from '../services/SweetNameGenerator'
import type { PublicTournament } from '../sharedTypes/typesTournament'
import { closeSockets } from '../test/handleSocket'
import { sleep } from '../helpers/sleep'
import type { GeneralSocketC } from '../test/socket'
import { isEqual } from 'lodash'

describe('TournamentPublic test suite via Socket.io', () => {
  describe('Test with two teams - registration process', () => {
    let tournamentID: number, tournament: any, usersWithSockets: UserWithSocket[], unauthSocket: GeneralSocketC

    const spyReminder = vitest.spyOn(mail, 'sendTournamentReminder')
    const spyInvitation = vitest.spyOn(mail, 'sendTournamentInvitation')

    beforeAll(async () => {
      usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3, 4] })
      unauthSocket = await getUnauthenticatedSocket()
    })

    afterEach(() => {
      vitest.clearAllMocks()
    })

    afterAll(async () => {
      await closeSockets([...usersWithSockets, unauthSocket])
    })

    test('Create Tournament', async () => {
      const apiRes = await testAgent
        .post('/gameApi/createTournament')
        .set({ Authorization: usersWithSockets[0].authHeader })
        .send({
          title: 'TestTournament',
          begin: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
          deadline: new Date(Date.now() + 1000 * 60 * 1000).toISOString(),
          creationDates: [new Date(Date.now() + 2000 * 60 * 1000).toISOString()],
          secondsPerGame: 5400,
          nTeams: 2,
        })
      expect(apiRes.statusCode).toBe(200)
      expect(apiRes.body.id).toBeGreaterThan(0)
      tournamentID = apiRes.body.id
    })

    test('Start Tournament', async () => {
      await startSignUpOnCondition(testServer.pgPool)
      const dbRes = await testServer.pgPool.query('SELECT status FROM tournaments WHERE id = $1;', [tournamentID])
      expect(dbRes.rows[0].status).toBe('signUp')
    })

    test('Should not register team with missing data', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:registerTeam', { players: [usersWithSockets[0].username], tournamentID } as any)
      expect(res.status).toBe(500)
    })

    test('Should not register team with invalid id', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:registerTeam', {
        players: [usersWithSockets[0].username],
        name: 'TestTeam',
        tournamentID: 1000000,
      } as any)
      expect(res.status).toBe(500)
    })

    test('First player create Team 1 alone', async () => {
      const promiseArray: any[] = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray.push(usersWithSockets[0].socket.oncePromise('tournament:toast:you-created-a-team'))

      const teamName = getDifferentName([])
      if (teamName.isErr()) {
        expect(teamName.isErr()).toBe(false)
        throw new Error('No Teamname found')
      }
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:registerTeam', {
        players: [usersWithSockets[0].username],
        name: teamName.value,
        tournamentID,
      })
      expect(res.status).toBe(200)

      await Promise.all(promiseArray).then((val: any) => {
        expect(val[0].registerTeams.length).toBe(1)
        expect(val[0].registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
        expect(val[0].registerTeams[0].activated[0]).toBe(true)
        tournament = val[0]
      })
    })

    test('Should not leave team with missing data', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:leaveTournament', {} as any)
      expect(res.status).toBe(500)
    })

    test('Should not leave team with invalid data', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:leaveTournament', { tournamentID: 1000000 })
      expect(res.status).toBe(500)
    })

    test('First player leave Team 1', async () => {
      const promiseArray: any[] = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray.push(usersWithSockets[0].socket.oncePromise('tournament:toast:you-left-tournament'))

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:leaveTournament', { tournamentID })
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        expect(val[0].registerTeams.length).toBe(0)
        tournament = val[0]
      })
    })

    test('First player create Team 1 with second player', async () => {
      const promiseArray: any[] = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray.push(usersWithSockets[0].socket.oncePromise('tournament:toast:you-created-a-team'))
      promiseArray.push(usersWithSockets[1].socket.oncePromise('tournament:toast:invited-to-a-team'))

      const teamName = getDifferentName([])
      if (teamName.isErr()) {
        expect(teamName.isErr()).toBe(false)
        throw new Error('No Teamname found')
      }

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:registerTeam', {
        players: [usersWithSockets[0].username, usersWithSockets[1].username],
        name: teamName.value,
        tournamentID,
      })
      expect(res.status).toBe(200)

      tournament = (await Promise.all(promiseArray))[0]

      expect(tournament.registerTeams.length).toBe(1)
      expect(tournament.registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
      expect(tournament.registerTeams[0].players[1]).toBe(usersWithSockets[1].username)
      expect(tournament.registerTeams[0].activated[0]).toBe(true)
      expect(tournament.registerTeams[0].activated[1]).toBe(false)

      await sleep(200) // TBD: Needed to pass test, but why?
      expect(spyInvitation).toBeCalledTimes(1)
    })

    test('Should not activate with missing data', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:public:activateUser', {} as any)
      expect(res.status).toBe(500)
    })

    test('Should not activate with invalid data', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:public:activateUser', { tournamentID: 1000000 })
      expect(res.status).toBe(500)
    })

    test('Second player activate', async () => {
      const promiseArray = usersWithSockets.map((uWS: any) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray.push(usersWithSockets[0].socket.oncePromise('tournament:toast:player-activated-team-complete'))
      promiseArray.push(usersWithSockets[1].socket.oncePromise('tournament:toast:you-activated-complete'))

      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:public:activateUser', { tournamentID })
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        expect(val[0].registerTeams.length).toBe(1)
        expect(val[0].registerTeams[0].players.length).toBe(2)
        expect(val[0].registerTeams[0].players.includes(usersWithSockets[0].username)).toBe(true)
        expect(val[0].registerTeams[0].players.includes(usersWithSockets[1].username)).toBe(true)
        expect(val[0].registerTeams[0].activated[0]).toBe(true)
        expect(val[0].registerTeams[0].activated[1]).toBe(true)
        tournament = val[0]
      })
    })

    test('Second player leave Team 1', async () => {
      const promiseArray = usersWithSockets.map((uWS: any) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray.push(usersWithSockets[0].socket.oncePromise('tournament:toast:partner-left-tournament'))
      promiseArray.push(usersWithSockets[1].socket.oncePromise('tournament:toast:you-left-tournament'))

      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:public:leaveTournament', { tournamentID })
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        expect(val[0].registerTeams.length).toBe(1)
        expect(val[0].registerTeams[0].players.length).toBe(1)
        expect(val[0].registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
        expect(val[0].registerTeams[0].activated[0]).toBe(true)
        tournament = val[0]
      })
    })

    test('Should not join with missing data', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:public:joinTeam', { teamName: tournament.registerTeams[0].name } as any)
      expect(res.status).toBe(500)
    })

    test('Should not join with invalid data', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:public:joinTeam', { teamName: tournament.registerTeams[0].name, tournamentID: 1000000 })
      expect(res.status).toBe(500)
    })

    test('Second player join Team 1', async () => {
      const promiseArray = usersWithSockets.map((uWS: any) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray.push(usersWithSockets[0].socket.oncePromise('tournament:toast:player-joined-team-complete'))
      promiseArray.push(usersWithSockets[1].socket.oncePromise('tournament:toast:you-joined-team-complete'))

      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:public:joinTeam', { teamName: tournament.registerTeams[0].name, tournamentID })
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        expect(val[0].registerTeams.length).toBe(1)
        expect(val[0].registerTeams[0].players.length).toBe(2)
        expect(val[0].registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
        expect(val[0].registerTeams[0].players[1]).toBe(usersWithSockets[1].username)
        expect(val[0].registerTeams[0].activated[0]).toBe(true)
        expect(val[0].registerTeams[0].activated[1]).toBe(true)
        tournament = val[0]
      })
    })

    test('Third player create Team 2 alone', async () => {
      const promiseArray = usersWithSockets.map((uWS: any) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray.push(usersWithSockets[2].socket.oncePromise('tournament:toast:you-created-a-team'))

      const teamName = getDifferentName([])
      if (teamName.isErr()) {
        expect(teamName.isErr()).toBe(false)
        throw new Error('No Teamname found')
      }

      const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:public:registerTeam', {
        players: [usersWithSockets[2].username],
        name: teamName.value,
        tournamentID,
      })
      expect(res.status).toBe(200)

      await Promise.all(promiseArray).then((val: any) => {
        expect(val[0].registerTeams.length).toBe(2)
        expect(val[0].registerTeams[1].players.length).toBe(1)
        expect(val[0].registerTeams[1].players[0]).toBe(usersWithSockets[2].username)
        expect(val[0].registerTeams[1].activated[0]).toBe(true)
        tournament = val[0]
      })
    })

    test('Fourth player join Team 2', async () => {
      let promiseArray = usersWithSockets.map((uWS: any) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray = [
        ...promiseArray,
        ...usersWithSockets.map((uWS: any) => {
          return uWS.socket.oncePromise('tournament:toast:signUpEnded-you-partizipate')
        }),
      ]

      const res = await usersWithSockets[3].socket.emitWithAck(5000, 'tournament:public:joinTeam', { teamName: tournament.registerTeams[1].name, tournamentID })
      expect(res.status).toBe(200)

      return Promise.all(promiseArray).then((val: any) => {
        expect(val[0].status).toBe('signUpEnded')
        expect(val[0].registerTeams.length).toBe(0)
        expect(val[0].teams.length).toBe(2)
        expect(val[0].data.brackets[0][0].teams.includes(-1)).toBe(false)
        tournament = val[0]
        expect(spyReminder).toBeCalledTimes(4)
        expect(spyReminder.mock.calls.map((c) => c[0].user.username).sort()).toEqual(usersWithSockets.map((uws) => uws.username).sort())
        expect(spyReminder.mock.calls[0][0].ical).not.toBe(null)
      })
    })

    test('Should not be able to request tournament without id', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:get', {} as any)
      expect(res.status).toBe(500)
    })

    test('Should not be able to request tournament with invalid id', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:get', { id: 1000000 })
      expect(res.status).toBe(500)
    })

    test('Should be able to request tournament', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:get', { id: tournamentID })
      expect(res.status).toBe(200)
      expect(res.data?.id).toBe(tournamentID)
    })

    test('Should be able to request current tournament', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:get-current')
      expect(res.status).toBe(200)
    })

    test.each(['tournament:public:registerTeam', 'tournament:public:joinTeam', 'tournament:public:activateUser', 'tournament:public:leaveTournament'])(
      'should not allow %s',
      async (eventname: any) => {
        const res = (await unauthSocket.emitWithAck(5000, eventname, 0)) as any
        expect(res.error).toBe('UNAUTH')
      }
    )
  })

  describe('Test failing signUp', () => {
    let tournamentID: number, usersWithSockets: UserWithSocket[]

    beforeAll(async () => {
      usersWithSockets = await getUsersWithSockets({ ids: [1] })
    })

    afterAll(async () => {
      await closeSockets(usersWithSockets)
    })

    test('Create Tournament', async () => {
      const apiRes = await testAgent
        .post('/gameApi/createTournament')
        .set({ Authorization: usersWithSockets[0].authHeader })
        .send({
          title: 'TestTournament',
          begin: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          deadline: new Date(Date.now() + 1000 * 60 * 1000).toISOString(),
          creationDates: [new Date(Date.now() + 5000 * 60 * 1000).toISOString()],
          secondsPerGame: 5400,
          nTeams: 2,
        })
      expect(apiRes.statusCode).toBe(200)
      expect(apiRes.body.id).toBeGreaterThan(0)
      tournamentID = apiRes.body.id
    })

    test('Start Tournament', async () => {
      await startSignUpOnCondition(testServer.pgPool)
      const res = await testServer.pgPool.query('SELECT status FROM tournaments WHERE id = $1;', [tournamentID])
      expect(res.rows[0].status).toBe('signUp')
    })

    test('First player create Team 1 alone', async () => {
      const promiseArray = [usersWithSockets[0].socket.oncePromise('tournament:toast:you-created-a-team')]

      const teamName = getDifferentName([])
      if (teamName.isErr()) {
        expect(teamName.isErr()).toBe(false)
        throw new Error('No Teamname found')
      }
      usersWithSockets[0].socket.emitWithAck(5000, 'tournament:public:registerTeam', { players: [usersWithSockets[0].username], name: teamName.value, tournamentID })

      await Promise.all(promiseArray).then((val: any) => {
        expect(val[0]?.registerTeam?.name).not.toBeUndefined()
      })
    })

    test('Check if Signup fails', async () => {
      await testServer.pgPool.query("UPDATE tournaments SET signup_deadline = current_timestamp - interval '1 minute' WHERE id = $1;", [tournamentID])

      await endSignUpOnCondition(testServer.pgPool)

      const tournament = await getPublicTournamentByID(testServer.pgPool, tournamentID)
      if (tournament.isOk()) expect(tournament.value.status).toBe('signUpFailed')
      else expect(tournament.error).toBe(null)
    })
  })

  describe('Test game creation process', () => {
    let tournamentID: number, tournament: PublicTournament, usersWithSockets: UserWithSocket[], gameIDMiniFinal: number
    const gameIdForTime = 3
    const gameIdEnded = 7

    beforeAll(async () => {
      usersWithSockets = await getUsersWithSockets({ n: 8 })
    })

    afterAll(async () => {
      await closeSockets(usersWithSockets)
    })

    test('Create Tournament', async () => {
      const apiRes = await testAgent
        .post('/gameApi/createTournament')
        .set({ Authorization: usersWithSockets[0].authHeader })
        .send({
          title: 'TestTournament',
          begin: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          deadline: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          creationDates: [new Date(Date.now() - 6 * 60 * 1000).toISOString(), new Date(Date.now() - 4 * 60 * 1000).toISOString()],
          secondsPerGame: 0,
          nTeams: 4,
        })
      expect(apiRes.statusCode).toBe(200)
      expect(apiRes.body.id).toBeGreaterThan(0)
      tournamentID = apiRes.body.id
    })

    test('Start Tournament-SignUp', async () => {
      await startSignUpOnCondition(testServer.pgPool)
      const result = await testServer.pgPool.query('SELECT status FROM tournaments WHERE id = $1;', [tournamentID])
      expect(result.rows[0].status).toBe('signUp')
    })

    test('First players create Teams', async () => {
      for (let i = 0; i < 4; i++) {
        const promiseArray = usersWithSockets.map((uWS: any) => {
          return uWS.socket.oncePromise('tournament:public:update')
        })
        promiseArray.push(usersWithSockets[i].socket.oncePromise('tournament:toast:you-created-a-team'))

        const teamName = getDifferentName([])
        if (teamName.isErr()) {
          expect(teamName.isErr()).toBe(false)
          throw new Error('No Teamname found')
        }
        usersWithSockets[i].socket.emitWithAck(5000, 'tournament:public:registerTeam', { players: [usersWithSockets[i].username], name: teamName.value, tournamentID })

        await Promise.all(promiseArray).then((val: any) => {
          expect(val[0].registerTeams.length).toBe(i + 1)
          tournament = val[0]
          expect(tournament.id).toBe(tournamentID)
        })
      }
    })

    test('Second players join Teams', async () => {
      for (let i = 0; i < 4; i++) {
        const team = tournament.registerTeams.find((t: any) => t.players.length === 1)
        const promiseArray = usersWithSockets.map((uWS: any) => {
          return uWS.socket.oncePromise('tournament:public:update')
        })

        usersWithSockets[4 + i].socket.emitWithAck(5000, 'tournament:public:joinTeam', { teamName: team?.name ?? '', tournamentID })

        tournament = (await Promise.all(promiseArray))[0]
      }

      expect(tournament.id).toBe(tournamentID)
      expect(tournament.status).toBe('signUpEnded')
      expect(tournament.registerTeams.length).toBe(0)
      expect(tournament.teams.length).toBe(4)
      expect(tournament.data.brackets.every((b: any) => b.every((m: any) => m.winner === -1 && m.gameID === -1 && isEqual(m.score, [0, 0])))).toBe(true)
      expect(tournament.data.brackets[1][0].teams).toStrictEqual([-1, -1])
      expect(
        tournament.data.brackets[0]
          .map((b: any) => b.teams)
          .flat()
          .sort()
      ).toStrictEqual([0, 1, 2, 3])
    })

    test('Start Tournament', async () => {
      const promiseArrayUpdate = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      const promiseArrayToast = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:toast:started')
      })

      await startTournament(testServer.pgPool)
      await Promise.all(promiseArrayToast)
      tournament = (await Promise.all(promiseArrayUpdate))[0]
      expect(tournament.id).toBe(tournamentID)
      expect(tournament.status).toBe('running')
      expect(tournament.data.brackets[0].every((m: any) => m.gameID !== -1)).toBe(true)
    })

    test('Force Tournament Round To End', async () => {
      const promiseArrayUpdate = usersWithSockets.map((uWS) => {
        return new Promise<any>((resolve) => {
          let i = 0
          uWS.socket.on('tournament:public:update', (data) => {
            if (i === 1) {
              resolve(data)
            }
            i++
          })
        })
      })
      const promiseArrayToast = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:toast:round-ended')
      })

      // Test game end with time condition
      await testServer.pgPool.query('UPDATE games SET game=(SELECT game FROM games WHERE id=$2) WHERE id=$1;', [tournament.data.brackets[0][0].gameID, gameIdForTime])

      await checkForceGameEnd(testServer.pgPool)
      await Promise.all(promiseArrayToast)
      tournament = (await Promise.all(promiseArrayUpdate))[0]
      expect(tournament.id).toBe(tournamentID)

      expect(tournament.status).toBe('running')
      expect(tournament.data.brackets[0].every((m: any) => m.winner !== -1)).toBe(true)
      expect(tournament.data.brackets[0][0].winner).toBe(tournament.data.brackets[0][0].teams[1])
      expect(tournament.data.brackets[1][0].teams.every((t: any) => [0, 1, 2, 3].includes(t))).toBe(true)
      expect(tournament.creationPhase).toBe(2)
    })

    test('Start Tournament Round 2', async () => {
      let promiseArray = usersWithSockets.map((uWS: any) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray = [
        ...promiseArray,
        ...usersWithSockets.map((uWS: any) => {
          return uWS.socket.oncePromise('tournament:toast:round-started')
        }),
      ]

      await startTournamentRound(testServer.pgPool)
      await Promise.all(promiseArray).then((val: any) => {
        tournament = val[0]
      })
      expect(tournament.id).toBe(tournamentID)

      expect(tournament.status).toBe('running')
      expect(tournament.data.brackets[1].every((m: any) => m.gameID !== -1)).toBe(true)
      expect(tournament.creationPhase).toBe(3)
    })

    test('Update score from game', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })

      await testServer.pgPool.query('UPDATE games SET public_tournament_id = $1 WHERE id = $2;', [tournamentID, gameIdEnded])
      const dbRes = await testServer.pgPool.query('SELECT data FROM tournaments WHERE id = $1;', [tournamentID])
      const data = dbRes.rows[0].data
      gameIDMiniFinal = data.brackets[1][1].gameID
      data.brackets[1][1].gameID = gameIdEnded
      await testServer.pgPool.query('UPDATE tournaments SET data = $2 WHERE id = $1;', [tournamentID, data])

      const game = await getGame(testServer.pgPool, gameIdEnded)
      game.game.gameEnded = false
      game.players = [
        tournament.teams[tournament.data.brackets[1][1].teams[0]].players[0],
        tournament.teams[tournament.data.brackets[1][1].teams[1]].players[0],
        tournament.teams[tournament.data.brackets[1][1].teams[0]].players[1],
        tournament.teams[tournament.data.brackets[1][1].teams[1]].players[1],
      ]

      await updateTournamentFromGame(testServer.pgPool, game)
      await Promise.all(promiseArray).then((val: any) => {
        tournament = val[0]
      })
      expect(tournament.id).toBe(tournamentID)

      expect(tournament.data.brackets[1][1].score).toStrictEqual([8, 7])
      expect(tournament.data.brackets[1][1].winner).toBe(-1)
    })

    test('Update score from ended game', async () => {
      const promiseArray = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })

      const game = await getGame(testServer.pgPool, gameIdEnded)
      game.players = [
        tournament.teams[tournament.data.brackets[1][1].teams[0]].players[0],
        tournament.teams[tournament.data.brackets[1][1].teams[1]].players[0],
        tournament.teams[tournament.data.brackets[1][1].teams[0]].players[1],
        tournament.teams[tournament.data.brackets[1][1].teams[1]].players[1],
      ]

      await updateTournamentFromGame(testServer.pgPool, game)
      await Promise.all(promiseArray).then((val: any) => {
        tournament = val[0]
      })
      expect(tournament.id).toBe(tournamentID)

      expect(tournament.data.brackets[1][1].score).toStrictEqual([8, 7])
      expect(tournament.data.brackets[1][1].winner).toBe(tournament.data.brackets[1][1].teams[0])
    })

    test('Update score from ended game - end Tournament', async () => {
      let promiseArray: any[] = usersWithSockets.map((uWS) => {
        return uWS.socket.oncePromise('tournament:public:update')
      })
      promiseArray = [
        ...promiseArray,
        ...usersWithSockets.map((uWS) => {
          return uWS.socket.oncePromise('tournament:toast:ended')
        }),
      ]

      await testServer.pgPool.query('UPDATE games SET public_tournament_id = $1 WHERE id = $2;', [tournamentID, gameIdEnded])
      const dbRes = await testServer.pgPool.query('SELECT data FROM tournaments WHERE id = $1;', [tournamentID])
      const data = dbRes.rows[0].data
      data.brackets[1][0].gameID = gameIDMiniFinal
      data.brackets[1][0].gameID = gameIdEnded
      await testServer.pgPool.query('UPDATE tournaments SET data = $2 WHERE id = $1;', [tournamentID, data])

      const game = await getGame(testServer.pgPool, gameIdEnded)
      game.players = [
        tournament.teams[tournament.data.brackets[1][0].teams[0]].players[0],
        tournament.teams[tournament.data.brackets[1][0].teams[1]].players[0],
        tournament.teams[tournament.data.brackets[1][0].teams[0]].players[1],
        tournament.teams[tournament.data.brackets[1][0].teams[1]].players[1],
      ]

      await updateTournamentFromGame(testServer.pgPool, game)
      await Promise.all(promiseArray).then((val: any) => {
        tournament = val[0]
      })
      expect(tournament.id).toBe(tournamentID)

      expect(tournament.status).toBe('ended')
      expect(tournament.data.brackets[1][0].score).toStrictEqual([8, 7])
      expect(tournament.data.brackets[1][0].winner).toBe(tournament.data.brackets[1][0].teams[0])
    })
  })
})
