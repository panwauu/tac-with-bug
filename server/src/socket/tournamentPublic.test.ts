//import { TacServer } from '../server';
//import supertest from 'supertest';
//import * as mail from '../communicationUtils/email';
//import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../test/userHelper';
//import { getGame } from '../services/game';
//import { getPublicTournamentByID, startTournament, startTournamentRound, checkForceGameEnd, updateTournamentFromGame } from '../services/tournamentsPublic';
//import { startSignUpOnCondition, endSignUpOnCondition } from '../services/tournamentsRegister';
//import { getDifferentName } from '../services/SweetNameGenerator';
//import { publicTournament } from '../../../shared/types/typesTournament';

/*async function tournamentCleanUp(server: TacServer, tournamentID: number) {
    await server.pgPool.query('DELETE FROM tournaments_register WHERE tournamentid = $1;', [tournamentID])
    await server.pgPool.query('DELETE FROM users_to_tournaments WHERE tournamentid = $1;', [tournamentID])
    await server.pgPool.query('DELETE FROM tournaments WHERE id = $1;', [tournamentID])
}*/

describe('Test Suite via Socket.io', () => {
    /*let agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
    })

    afterAll(async () => {
        await server.destroy()
    })*/

    test.todo('Reactivate Tournament Tests')

    /*describe('Test with two users - registration process', () => {
        let tournamentID: number, tournament: any, usersWithSockets: userWithCredentialsAndSocket[];

        const spyReminder = jest.spyOn(mail, 'sendTournamentReminder');
        const spyInvitation = jest.spyOn(mail, 'sendTournamentInvitation');

        beforeAll(async () => {
            usersWithSockets = await registerNUsersWithSockets(server, agent, 4);
            await server.pgPool.query('UPDATE users SET admin=true WHERE id=$1;', [usersWithSockets[0].id])
        })

        afterEach(() => { jest.clearAllMocks() })

        afterAll(async () => {
            await tournamentCleanUp(server, tournamentID)
            await unregisterUsersWithSockets(agent, usersWithSockets)
        })

        test('Create Tournament', async () => {
            const apiRes = await agent.post('/gameApi/createTournament')
                .set({ Authorization: usersWithSockets[0].authHeader })
                .send({
                    title: 'TestTournament',
                    begin: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
                    deadline: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
                    creationDates: [new Date(Date.now() + 2 * 60 * 1000).toISOString()],
                    secondsPerGame: 5400,
                    nTeams: 2
                })
            expect(apiRes.statusCode).toBe(200)
            expect(apiRes.body.id).toBeGreaterThan(0);
            tournamentID = apiRes.body.id
        })

        test('Start Tournament', async () => {
            await startSignUpOnCondition(server.pgPool)
            const dbRes = await server.pgPool.query('SELECT status FROM tournaments WHERE id = $1;', [tournamentID])
            expect(dbRes.rows[0].status).toBe('signUp')
        })

        test('First player create Team 1 alone', async () => {
            const promiseArray = usersWithSockets.map((uWS: any) => {
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[0].socket.once('tournament:toast:you-created-a-team', (data: any) => { return resolve(data) })
            }))

            const teamName = getDifferentName([])
            if (teamName.isErr()) { expect(teamName.isErr()).toBe(false); return }
            usersWithSockets[0].socket.emit('tournament:public:registerTeam', { players: [usersWithSockets[0].username], name: teamName.value, tournamentID });

            return Promise.all(promiseArray).then((val: any) => {
                expect(val[0].registerTeams.length).toBe(1)
                expect(val[0].registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
                expect(val[0].registerTeams[0].activated[0]).toBe(true)
                tournament = val[0]
            })
        })

        test('First player leave Team 1', async () => {
            const promiseArray = usersWithSockets.map((uWS: any) => {
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[0].socket.once('tournament:toast:you-left-tournament', (data: any) => { return resolve(data) })
            }))

            usersWithSockets[0].socket.emit('tournament:public:leaveTournament', { tournamentID });

            return Promise.all(promiseArray).then((val: any) => {
                expect(val[0].registerTeams.length).toBe(0)
                tournament = val[0]
            })
        })

        test('First player create Team 1 with second player', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:public:update', (data: any) => { return resolve(data) }) })
            })
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[0].socket.once('tournament:toast:you-created-a-team', (data: any) => { return resolve(data) })
            }))
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[1].socket.once('tournament:toast:invited-to-a-team', (data: any) => { return resolve(data) })
            }))

            const teamName = getDifferentName([])
            if (teamName.isErr()) { expect(teamName.isErr()).toBe(false); return }
            usersWithSockets[0].socket.emit('tournament:public:registerTeam', { players: [usersWithSockets[0].username, usersWithSockets[1].username], name: teamName.value, tournamentID });

            return Promise.all(promiseArray).then((val: any) => {
                expect(val[0].registerTeams.length).toBe(1)
                expect(val[0].registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
                expect(val[0].registerTeams[0].players[1]).toBe(usersWithSockets[1].username)
                expect(val[0].registerTeams[0].activated[0]).toBe(true)
                expect(val[0].registerTeams[0].activated[1]).toBe(false)
                tournament = val[0]
                expect(spyInvitation).toBeCalledTimes(1)
            })
        })

        test('Second player activate', async () => {
            const promiseArray = usersWithSockets.map((uWS: any) => {
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[0].socket.once('tournament:toast:player-activated-team-complete', (data: any) => { return resolve(data) })
            }))
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[1].socket.once('tournament:toast:you-activated-complete', (data: any) => { return resolve(data) })
            }))

            usersWithSockets[1].socket.emit('tournament:public:activateUser', { tournamentID });

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
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[0].socket.once('tournament:toast:partner-left-tournament', (data: any) => { return resolve(data) })
            }))
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[1].socket.once('tournament:toast:you-left-tournament', (data: any) => { return resolve(data) })
            }))

            usersWithSockets[1].socket.emit('tournament:public:leaveTournament', { tournamentID });

            return Promise.all(promiseArray).then((val: any) => {
                expect(val[0].registerTeams.length).toBe(1)
                expect(val[0].registerTeams[0].players.length).toBe(1)
                expect(val[0].registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
                expect(val[0].registerTeams[0].activated[0]).toBe(true)
                tournament = val[0]
            })
        })

        test('Second player join Team 1', async () => {
            const promiseArray = usersWithSockets.map((uWS: any) => {
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[0].socket.once('tournament:toast:player-joined-team-complete', (data: any) => { return resolve(data) })
            }))
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[1].socket.once('tournament:toast:you-joined-team-complete', (data: any) => { return resolve(data) })
            }))

            usersWithSockets[1].socket.emit('tournament:public:joinTeam', { teamName: tournament.registerTeams[0].name, tournamentID });

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
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray.push(new Promise<any>((resolve) => {
                usersWithSockets[2].socket.once('tournament:toast:you-created-a-team', (data: any) => { return resolve(data) })
            }))

            const teamName = getDifferentName([])
            if (teamName.isErr()) { expect(teamName.isErr()).toBe(false); return }
            usersWithSockets[2].socket.emit('tournament:public:registerTeam', { players: [usersWithSockets[2].username], name: teamName.value, tournamentID });

            return Promise.all(promiseArray).then((val: any) => {
                expect(val[0].registerTeams.length).toBe(2)
                expect(val[0].registerTeams[1].players.length).toBe(1)
                expect(val[0].registerTeams[1].players[0]).toBe(usersWithSockets[2].username)
                expect(val[0].registerTeams[1].activated[0]).toBe(true)
                tournament = val[0]
            })
        })

        test('Fourth player join Team 2', async () => {
            let promiseArray = usersWithSockets.map((uWS: any) => {
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray = [...promiseArray, ...usersWithSockets.map((uWS: any) => {
                return new Promise<any>((resolve) => { uWS.socket.once('tournament:toast:signUpEnded-you-partizipate', (data: any) => { return resolve(data) }) })
            })]

            usersWithSockets[3].socket.emit('tournament:public:joinTeam', { teamName: tournament.registerTeams[1].name, tournamentID });

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
    })*/


    /*describe('Test failing signUp', () => {
        let tournamentID: number, usersWithSockets: userWithCredentialsAndSocket[];

        beforeAll(async () => {
            usersWithSockets = await registerNUsersWithSockets(server, agent, 1);
            await server.pgPool.query('UPDATE users SET admin=true WHERE id=$1;', [usersWithSockets[0].id])
        })

        afterAll(async () => {
            await tournamentCleanUp(server, tournamentID)
            await unregisterUsersWithSockets(agent, usersWithSockets)
        })

        test('Create Tournament', async () => {
            const apiRes = await agent.post('/gameApi/createTournament')
                .set({ Authorization: usersWithSockets[0].authHeader })
                .send({
                    title: 'TestTournament',
                    begin: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    deadline: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
                    creationDates: [new Date(Date.now() + 5 * 60 * 1000).toISOString()],
                    secondsPerGame: 5400,
                    nTeams: 2
                })
            expect(apiRes.statusCode).toBe(200)
            expect(apiRes.body.id).toBeGreaterThan(0);
            tournamentID = apiRes.body.id
        })

        test('Start Tournament', async () => {
            await startSignUpOnCondition(server.pgPool)
            const res = await server.pgPool.query('SELECT status FROM tournaments WHERE id = $1;', [tournamentID])
            expect(res.rows[0].status).toBe('signUp')
        })

        test('First player create Team 1 alone', async () => {
            const promiseArray = [new Promise((resolve) => {
                usersWithSockets[0].socket.once('tournament:toast:you-created-a-team', (data: any) => { return resolve(data) })
            })]

            const teamName = getDifferentName([])
            if (teamName.isErr()) { expect(teamName.isErr()).toBe(false); return }
            usersWithSockets[0].socket.emit('tournament:public:registerTeam', { players: [usersWithSockets[0].username], name: teamName.value, tournamentID });

            return Promise.all(promiseArray).then((val: any) => {
                expect(val[0].registerTeams.length).toBe(1)
                expect(val[0].registerTeams[0].players[0]).toBe(usersWithSockets[0].username)
                expect(val[0].registerTeams[0].activated[0]).toBe(true)
            })
        })

        test('Check if Signup fails', async () => {
            await server.pgPool.query('UPDATE tournaments SET signup_deadline = current_timestamp - interval \'1 minute\' WHERE id = $1;', [tournamentID])

            await endSignUpOnCondition(server.pgPool)

            const tournament = await getPublicTournamentByID(server.pgPool, tournamentID)
            tournament.isOk() ? expect(tournament.value.status).toBe('signUpFailed') : expect(tournament.error).toBe(null)
        })
    })*/

    /*describe('Test game creation process', () => {
        let tournamentID: number, tournament: publicTournament, usersWithSockets: userWithCredentialsAndSocket[], gameIDMiniFinal: number;
        const gameID = 32;

        beforeAll(async () => {
            usersWithSockets = await registerNUsersWithSockets(server, agent, 8);
            await server.pgPool.query('UPDATE users SET admin=true WHERE id=$1;', [usersWithSockets[0].id])
        })

        afterAll(async () => {
            await server.pgPool.query('UPDATE games SET public_tournament_id = null WHERE id = $1;', [gameID])
            await server.pgPool.query('DELETE FROM users_to_games USING games WHERE users_to_games.gameid = games.id AND games.public_tournament_id = $1;', [tournamentID])
            await server.pgPool.query('DELETE FROM games WHERE public_tournament_id = $1;', [tournamentID])
            await server.pgPool.query('DELETE FROM tournaments_register WHERE tournamentid = $1;', [tournamentID])
            await server.pgPool.query('DELETE FROM users_to_tournaments WHERE tournamentid = $1;', [tournamentID])
            await server.pgPool.query('DELETE FROM tournaments WHERE id = $1;', [tournamentID])
            await unregisterUsersWithSockets(agent, usersWithSockets)
        })

        test('Create Tournament', async () => {
            const apiRes = await agent.post('/gameApi/createTournament')
                .set({ Authorization: usersWithSockets[0].authHeader })
                .send({
                    title: 'TestTournament',
                    begin: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                    deadline: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
                    creationDates: [new Date(Date.now() - 6 * 60 * 1000).toISOString(), new Date(Date.now() - 4 * 60 * 1000).toISOString()],
                    secondsPerGame: 0,
                    nTeams: 4
                })
            expect(apiRes.statusCode).toBe(200)
            expect(apiRes.body.id).toBeGreaterThan(0);
            tournamentID = apiRes.body.id
        })

        test('Start Tournament', async () => {
            await startSignUpOnCondition(server.pgPool)
            const result = await server.pgPool.query('SELECT status FROM tournaments WHERE id = $1;', [tournamentID])
            expect(result.rows[0].status).toBe('signUp')
        })

        test('First players create Teams', async () => {
            for (let i = 0; i < 4; i++) {
                const promiseArray = usersWithSockets.map((uWS: any) => {
                    return new Promise((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
                })
                promiseArray.push(new Promise((resolve) => {
                    usersWithSockets[i].socket.once('tournament:toast:you-created-a-team', (data: any) => { return resolve(data) })
                }))

                const teamName = getDifferentName([])
                if (teamName.isErr()) { expect(teamName.isErr()).toBe(false); return }
                usersWithSockets[i].socket.emit('tournament:public:registerTeam', { players: [usersWithSockets[i].username], name: teamName.value, tournamentID });

                await Promise.all(promiseArray).then((val: any) => {
                    expect(val[0].registerTeams.length).toBe(i + 1)
                    tournament = val[0]
                })
            }
        })

        test('Second players join Teams', async () => {
            for (let i = 0; i < 4; i++) {
                const team = tournament.registerTeams.find((t: any) => t.players.length === 1)
                const promiseArray = usersWithSockets.map((uWS: any) => {
                    return new Promise((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
                })

                usersWithSockets[4 + i].socket.emit('tournament:public:joinTeam', { teamName: team?.name ?? '', tournamentID });

                await Promise.all(promiseArray).then((val: any) => {
                    tournament = val[0]
                })
            }

            expect(tournament.status).toBe('signUpEnded')
            expect(tournament.registerTeams.length).toBe(0)
            expect(tournament.teams.length).toBe(4)
            expect(tournament.data.brackets.every((b: any) => b.every((m: any) => m.winner === -1 && m.gameID === -1 && m.score === [0, 0])))
            expect(tournament.data.brackets[1][0].teams).toStrictEqual([-1, -1])
            expect(tournament.data.brackets[0].map((b: any) => b.teams).flat().sort()).toStrictEqual([0, 1, 2, 3])
        })

        test('Start Tournament', async () => {
            let promiseArray = usersWithSockets.map((uWS: any) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray = [...promiseArray, ...usersWithSockets.map((uWS: any) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:toast:started', (data: any) => { return resolve(data) }) })
            })]

            await startTournament(server.pgPool)
            await Promise.all(promiseArray).then((val: any) => { tournament = val[0] })

            expect(tournament.status).toBe('running')
            expect(tournament.data.brackets[0].every((m: any) => m.gameID !== -1))
        })

        test('Force Tournament Round To End', async () => {
            let promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => {
                    let i = 0;
                    uWS.socket.on('tournament:public:update', (data) => {
                        if (i === 1) { resolve(data) } i++
                    })
                })
            })
            promiseArray = [...promiseArray, ...usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:toast:round-ended', (data) => { return resolve(data) }) })
            })]

            // Test game end with time condition
            await server.pgPool.query('UPDATE games SET game=(SELECT game FROM games WHERE id=1310) WHERE id=$1;', [tournament.data.brackets[0][0].gameID])

            await checkForceGameEnd(server.pgPool)
            await Promise.all(promiseArray).then((val: any) => { tournament = val[0] })

            expect(tournament.status).toBe('running')
            expect(tournament.data.brackets[0].every((m: any) => m.winner !== -1))
            expect(tournament.data.brackets[0][0].winner).toBe(tournament.data.brackets[0][0].teams[1])
            expect(tournament.data.brackets[1][0].teams.every((t: any) => [0, 1, 2, 3].includes(t))).toBe(true)
            expect(tournament.creationPhase).toBe(2)
        })

        test('Start Tournament Round 2', async () => {
            let promiseArray = usersWithSockets.map((uWS: any) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:get-current', (data: any) => { return resolve(data) }) })
            })
            promiseArray = [...promiseArray, ...usersWithSockets.map((uWS: any) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:toast:round-started', (data: any) => { return resolve(data) }) })
            })]

            await startTournamentRound(server.pgPool)
            await Promise.all(promiseArray).then((val: any) => { tournament = val[0] })

            expect(tournament.status).toBe('running')
            expect(tournament.data.brackets[1].every((m: any) => m.gameID !== -1))
            expect(tournament.creationPhase).toBe(3)
        })

        test('Update score from game', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:public:update', (data) => { return resolve(data) }) })
            })

            await server.pgPool.query('UPDATE games SET public_tournament_id = $1 WHERE id = $2;', [tournamentID, gameID])
            const dbRes = await server.pgPool.query('SELECT data FROM tournaments WHERE id = $1;', [tournamentID])
            const data = dbRes.rows[0].data
            gameIDMiniFinal = data.brackets[1][1].gameID
            data.brackets[1][1].gameID = gameID
            await server.pgPool.query('UPDATE tournaments SET data = $2 WHERE id = $1;', [tournamentID, data])

            const game = await getGame(server.pgPool, gameID)
            game.game.gameEnded = false
            game.players = [
                tournament.teams[tournament.data.brackets[1][1].teams[0]].players[0],
                tournament.teams[tournament.data.brackets[1][1].teams[1]].players[0],
                tournament.teams[tournament.data.brackets[1][1].teams[0]].players[1],
                tournament.teams[tournament.data.brackets[1][1].teams[1]].players[1]
            ]

            await updateTournamentFromGame(server.pgPool, game)
            await Promise.all(promiseArray).then((val: any) => { tournament = val[0] })

            expect(tournament.data.brackets[1][1].score).toStrictEqual([8, 5])
            expect(tournament.data.brackets[1][1].winner).toBe(-1)
        })

        test('Update score from ended game', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:public:update', (data) => { return resolve(data) }) })
            })

            const game = await getGame(server.pgPool, gameID)
            game.players = [
                tournament.teams[tournament.data.brackets[1][1].teams[0]].players[0],
                tournament.teams[tournament.data.brackets[1][1].teams[1]].players[0],
                tournament.teams[tournament.data.brackets[1][1].teams[0]].players[1],
                tournament.teams[tournament.data.brackets[1][1].teams[1]].players[1]
            ]

            await updateTournamentFromGame(server.pgPool, game)
            await Promise.all(promiseArray).then((val: any) => { tournament = val[0] })

            expect(tournament.data.brackets[1][1].score).toStrictEqual([8, 5])
            expect(tournament.data.brackets[1][1].winner).toBe(tournament.data.brackets[1][1].teams[0])
        })

        test('Update score from ended game - end Tournament', async () => {
            let promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:public:update', (data) => { return resolve(data) }) })
            })
            promiseArray = [...promiseArray, ...usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('tournament:toast:ended', (data) => { return resolve(data) }) })
            })]

            await server.pgPool.query('UPDATE games SET public_tournament_id = $1 WHERE id = $2;', [tournamentID, gameID])
            const dbRes = await server.pgPool.query('SELECT data FROM tournaments WHERE id = $1;', [tournamentID])
            const data = dbRes.rows[0].data
            data.brackets[1][0].gameID = gameIDMiniFinal
            data.brackets[1][0].gameID = gameID
            await server.pgPool.query('UPDATE tournaments SET data = $2 WHERE id = $1;', [tournamentID, data])

            const game = await getGame(server.pgPool, gameID)
            game.players = [
                tournament.teams[tournament.data.brackets[1][0].teams[0]].players[0],
                tournament.teams[tournament.data.brackets[1][0].teams[1]].players[0],
                tournament.teams[tournament.data.brackets[1][0].teams[0]].players[1],
                tournament.teams[tournament.data.brackets[1][0].teams[1]].players[1]
            ]

            await updateTournamentFromGame(server.pgPool, game)
            await Promise.all(promiseArray).then((val: any) => { tournament = val[0] })

            expect(tournament.status).toBe('ended')
            expect(tournament.data.brackets[1][0].score).toStrictEqual([8, 5])
            expect(tournament.data.brackets[1][0].winner).toBe(tournament.data.brackets[1][0].teams[0])
        })
    })*/
})
