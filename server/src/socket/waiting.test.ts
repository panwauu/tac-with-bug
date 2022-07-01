import type { GameSocketC } from '../../../shared/types/GameNamespaceDefinition';
import { TacServer } from '../server';
import supertest from 'supertest';
import { registerGameSocket, registerNUsersWithSockets, unregisterGameSocket, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';
import Chance from 'chance';
import { Result } from '../../../shared/types/GeneralNamespaceDefinition';
import { disableRematchOfOldGames, getGame } from '../services/game';
const chance = new Chance();

describe('Test Suite via Socket.io', () => {
    let agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
    })

    afterAll(async () => {
        await server.destroy()
    })

    describe('Test with one users', () => {
        let waitingGameID: number, usersWithSockets: userWithCredentialsAndSocket[];

        beforeAll(async () => {
            usersWithSockets = await registerNUsersWithSockets(server, agent, 1);
            await server.pgPool.query('UPDATE users SET freelicense=true WHERE id = $1;', [usersWithSockets[0].id])
        })

        afterAll(async () => {
            await server.pgPool.query('DELETE FROM waitinggames;')
            await unregisterUsersWithSockets(agent, usersWithSockets)
        })

        test('Test get games - should be Empty at beginning', (done) => {
            usersWithSockets[0].socket.once('waiting:getGames', (data: any) => {
                try {
                    expect(data).toStrictEqual([]);
                    done();
                } catch (err) { done(err) }
            });
            usersWithSockets[0].socket.emit('waiting:getGames');
        })

        test('Test createGame', async () => {
            const nPlayers = chance.pickone([4, 6])
            const gameData = {
                nPlayers: nPlayers,
                nTeams: chance.pickone(nPlayers === 4 ? [1, 2] : [1, 2, 3]),
                meister: chance.bool(),
                private: chance.bool()
            }

            const dataPromise = new Promise<any>((resolve) => { usersWithSockets[0].socket.once('waiting:getGames', (data: any) => { resolve(data) }) })
            usersWithSockets[0].socket.emit('waiting:createGame', gameData);

            const game = (await dataPromise)[0]
            expect(game).not.toBeUndefined()
            expect(game.gameid).toBe(null);
            expect(game.nPlayers).toBe(gameData.nPlayers);
            expect(game.nTeams).toBe(gameData.nTeams);
            expect(game.meister).toBe(gameData.meister);
            expect(game.private).toBe(gameData.private);
            expect(game.admin).toBe(usersWithSockets[0].username);
            expect(game.adminID).toBe(usersWithSockets[0].id);
            expect(game.playerIDs[0]).toBeGreaterThan(0);
            expect(game.playerIDs.splice(1, 6).every((p: any) => p === null)).toBe(true);
            expect(game.players[0]).toBe(usersWithSockets[0].username);
            expect(game.players.splice(1, 6).every((p: any) => p === null)).toBe(true);
            expect(typeof game.balls[0]).toBe('string');
            expect(game.balls.splice(1, 6).every((p: any) => p === null)).toBe(true);
            expect(game.ready.every((r: any) => r === false)).toBe(true);
            waitingGameID = game.id;
        });

        test('Test switchColor', (done) => {
            const switching = { gameID: waitingGameID, username: usersWithSockets[0].username, color: 'blue' }

            usersWithSockets[0].socket.once('waiting:getGames', (data: any) => {
                const game = data[0];
                try {
                    expect(game.balls[0]).toBe('blue');
                    done();
                } catch (err) { done(err) }
            });
            usersWithSockets[0].socket.emit('waiting:switchColor', switching);
        })

        test('Test movePlayer', (done) => {
            const move = { gameID: waitingGameID, username: usersWithSockets[0].username, steps: 1 }

            usersWithSockets[0].socket.once('waiting:getGames', (data: any) => {
                const game = data[0];
                try {
                    expect(game).not.toBeUndefined()
                    expect(game.gameid).toBe(null);
                    expect(game.admin).toBe(usersWithSockets[0].username);
                    expect(game.playerIDs[1]).toBeGreaterThan(0);
                    expect([game.playerIDs[0], ...game.playerIDs.splice(2, 6)].every(p => p === null)).toBe(true);
                    expect(game.players[1]).toBe(usersWithSockets[0].username);
                    expect([game.players[0], ...game.players.splice(2, 6)].every(p => p === null)).toBe(true);
                    expect(typeof game.balls[1]).toBe('string');
                    expect([game.balls[0], ...game.balls.splice(2, 6)].every(p => p === null)).toBe(true);
                    expect(game.ready.every((r: any) => r === false)).toBe(true);
                    done();
                } catch (err) { done(err) }
            });
            usersWithSockets[0].socket.emit('waiting:movePlayer', move);
        })

        test('Test removePlayer', (done) => {
            usersWithSockets[0].socket.once('waiting:getGames', (data: any) => {
                try {
                    expect(data).toStrictEqual([]);
                    done()
                } catch (err) { done(err) }
            });
            usersWithSockets[0].socket.emit('waiting:removePlayer', usersWithSockets[0].username);
        })
    })

    describe('Test with multiple users', () => {
        let waitingGameID: number, usersWithSockets: any[], gameID: number;

        beforeAll(async () => {
            usersWithSockets = await registerNUsersWithSockets(server, agent, 4);
        })

        afterAll(async () => {
            await server.pgPool.query('DELETE FROM waitinggames;')
            await unregisterUsersWithSockets(agent, usersWithSockets)
        })

        test('Create Game', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[0].socket.emit('waiting:createGame', { nPlayers: 4, nTeams: 2, meister: true, private: false });

            return Promise.all(promiseArray).then((val: any) => {
                const game = val[0][0]
                expect(game.id).toBeGreaterThan(0)
                expect(game.players[0]).toBe(usersWithSockets[0].username);
                waitingGameID = game.id;
            })
        })

        test('Join second player', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[1].socket.emit('waiting:joinGame', waitingGameID);

            return Promise.all(promiseArray).then((val: any) => {
                const game = val[0][0]
                expect(game.players[1]).toBe(usersWithSockets[1].username);
            })
        })

        test('Join third player', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[2].socket.emit('waiting:joinGame', waitingGameID);

            return Promise.all(promiseArray).then((val: any) => {
                const game = val[0][0]
                expect(game.players[2]).toBe(usersWithSockets[2].username);
            })
        })

        test('Join last player', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[3].socket.emit('waiting:joinGame', waitingGameID);

            return Promise.all(promiseArray).then((val: any) => {
                const game = val[0][0]
                expect(game.players[3]).toBe(usersWithSockets[3].username);
            })
        })

        test('Ready first player', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[0].socket.emit('waiting:readyPlayer', { gameID: waitingGameID });

            return Promise.all(promiseArray).then((val: any) => {
                const game = val[0][0]
                expect(game.ready[0]).toBe(true);
            })
        })

        test('Ready second player', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[1].socket.emit('waiting:readyPlayer', { gameID: waitingGameID });

            return Promise.all(promiseArray).then((val: any) => {
                const game = val[0][0]
                expect(game.ready[1]).toBe(true);
            })
        })

        test('Ready third player', async () => {
            const promiseArray = usersWithSockets.map((uWS) => {
                return new Promise((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[2].socket.emit('waiting:readyPlayer', { gameID: waitingGameID });

            return Promise.all(promiseArray).then((val: any) => {
                const game = val[0][0]
                expect(game.ready[2]).toBe(true);
            })
        })

        test('Ready last player', async () => {
            const pGetGames = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })
            const pStartGame = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => { uWS.socket.once('waiting:startGame', (data: any) => { return resolve(data) }) })
            })

            usersWithSockets[3].socket.emit('waiting:readyPlayer', { gameID: waitingGameID });

            const val = await Promise.all([...pGetGames, ...pStartGame])
            expect(val[0].length).toBe(0);
            expect(val[4].gamePlayer).toBe(0);
            expect(val[5].gamePlayer).toBe(2);
            expect(val[6].gamePlayer).toBe(1);
            expect(val[7].gamePlayer).toBe(3);
            expect(val[4].gameID).toBeGreaterThan(0);

            const game = await getGame(server.pgPool, val[4].gameID)
            expect(game.players.sort()).toEqual(usersWithSockets.map((uws) => uws.username).sort())
            expect(game.playerIDs.sort()).toEqual(usersWithSockets.map((uws) => uws.id).sort())
            expect(game.status).toBe('running')
            expect(game.rematch_open).toBe(false)
            gameID = game.id
        })

        test('Abort of game should be auth secured', async () => {
            await server.pgPool.query('UPDATE games SET created = current_timestamp, public_tournament_id = NULL WHERE id=$1;', [gameID])
            const res = await agent.delete('/gameApi/abortGame/')
            expect(res.status).toBe(401)
        })

        test('Abort of game should not be possible for another game', async () => {
            await server.pgPool.query('UPDATE games SET created = current_timestamp, public_tournament_id = NULL WHERE id=$1;', [gameID])
            const res = await agent.delete('/gameApi/abortGame/')
                .set({ Authorization: usersWithSockets[0].authHeader })
                .send({ gameID: 1000 })
            expect(res.status).toBe(403)
        })

        test('Abort of game should not be possible for tournament game', async () => {
            await server.pgPool.query('UPDATE games SET created = current_timestamp, public_tournament_id = 1 WHERE id=$1;', [gameID])
            const res = await agent.delete('/gameApi/abortGame/')
                .set({ Authorization: usersWithSockets[0].authHeader })
                .send({ gameID: gameID })
            expect(res.body).toContain('tournament')
            expect(res.status).toBe(403)
        })

        test('Abort of game should not be possible for game older 5 minutes', async () => {
            await server.pgPool.query('UPDATE games SET created = current_timestamp - interval\'6 minutes\', public_tournament_id = NULL WHERE id=$1;', [gameID])
            const res = await agent.delete('/gameApi/abortGame/')
                .set({ Authorization: usersWithSockets[0].authHeader })
                .send({ gameID: gameID })
            expect(res.status).toBe(403)
        })

        test('Abort of game should be possible for own game', async () => {
            await server.pgPool.query('UPDATE games SET created = current_timestamp, public_tournament_id = NULL WHERE id=$1;', [gameID])
            const res = await agent.delete('/gameApi/abortGame/')
                .set({ Authorization: usersWithSockets[0].authHeader })
                .send({ gameID: gameID })
            expect(res.status).toBe(204)

            const gameStatus = await server.pgPool.query('SELECT status FROM games WHERE id=$1;', [gameID])
            expect(gameStatus.rows[0].status).toBe('aborted')
        })
    })

    describe('Test Rematch mode', () => {
        let usersWithSockets: userWithCredentialsAndSocket[], gameSocket: GameSocketC;
        const gameID = 338;
        const gameUsers = [7, 4, 8, 15];

        beforeAll(async () => {
            usersWithSockets = await registerNUsersWithSockets(server, agent, 4);
            for (let i = 0; i < gameUsers.length; i++) {
                await server.pgPool.query('UPDATE users_to_games SET userid = $1 WHERE player_index = $2 AND gameid = $3;', [usersWithSockets[i].id, i, gameID])
            }
            await server.pgPool.query('UPDATE games SET lastplayed=current_timestamp, rematch_open=true WHERE id = $1;', [gameID])
            gameSocket = await registerGameSocket(gameID, usersWithSockets[0].token)
        })

        afterAll(async () => {
            for (let i = 0; i < gameUsers.length; i++) {
                await server.pgPool.query('UPDATE users_to_games SET userid = $1 WHERE player_index = $2 AND gameid = $3;', [gameUsers[i], i, gameID])
            }
            await server.pgPool.query('UPDATE games SET lastplayed=\'2021-02-07 20:15:13.88577+00\', rematch_open = false WHERE id = $1;', [gameID])
            await server.pgPool.query('DELETE FROM waitinggames;')
            await unregisterGameSocket(gameSocket)
            await unregisterUsersWithSockets(agent, usersWithSockets)
        })

        test('Unable to rematch if one player is already in a waiting room', async () => {
            await server.pgPool.query('UPDATE games SET rematch_open=true WHERE id = $1;', [gameID])

            const waitForUserInGame = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => { uWS.socket.once('waiting:getGames', (data) => { return resolve(data) }) })
            })
            usersWithSockets[1].socket.emit('waiting:createGame', { nPlayers: 4, nTeams: 2, meister: true, private: false });
            const waitForUserInGameRes = await Promise.all(waitForUserInGame);
            expect(waitForUserInGameRes[0].length).toEqual(1)

            const waitForGameUpdate = new Promise<any>((resolve) => { gameSocket.once('update', (data) => { resolve(data) }) })
            const error = await new Promise<Result<null, any>>((resolve) => usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => { resolve(data) }))
            expect(error.ok === false ? error.error : '').toEqual('PLAYER_ALREADY_IN_WAITING_GAME')

            const game = await waitForGameUpdate
            expect(game.rematch_open).toBe(false)

            const waitForLeaveGame = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })
            usersWithSockets[1].socket.emit('waiting:removePlayer', usersWithSockets[1].username);
            const waitForLeaveGameRes = await Promise.all(waitForLeaveGame)
            expect(waitForLeaveGameRes[0].length).toEqual(0)
        })

        test('Unable to rematch if one player is not online', async () => {
            await server.pgPool.query('UPDATE games SET rematch_open=true WHERE id = $1;', [gameID])

            const waitForGameUpdate = new Promise<any>((resolve) => { gameSocket.once('update', (data) => { resolve(data) }) })
            const disconnectPromise = new Promise<null>((resolve) => { usersWithSockets[1].socket.once('disconnect', () => { resolve(null) }) })
            usersWithSockets[1].socket.disconnect()
            await disconnectPromise

            const error = await new Promise<Result<null, any>>((resolve) => usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => { resolve(data) }))
            expect(error.ok === false ? error.error : '').toEqual('PLAYER_NOT_ONLINE')

            const game = await waitForGameUpdate
            expect(game.rematch_open).toBe(false)

            const connectPromise = new Promise<null>((resolve) => { usersWithSockets[1].socket.once('connect', () => { resolve(null) }) })
            usersWithSockets[1].socket.connect()
            await connectPromise
        })

        test('Rematch should be created', async () => {
            await server.pgPool.query('UPDATE games SET rematch_open=true WHERE id = $1;', [gameID])

            const promises = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })

            const result = await new Promise<Result<null, any>>((resolve) => usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => { resolve(data) }))
            expect(result.ok).toBe(true)

            const res = await Promise.all(promises)
            expect(res[0].length).toBe(1)
            expect(res[0][0].admin).toEqual(usersWithSockets[0].username)
            expect(res[0][0].ready.some((r: boolean) => r)).toEqual(false)
            expect(res[0][0].players).toContain(usersWithSockets[0].username)
            expect(res[0][0].players).toContain(usersWithSockets[1].username)

            const dbRes = await server.pgPool.query('SELECT rematch_open FROM games WHERE id=$1;', [gameID])
            expect(dbRes.rows[0].rematch_open).toBe(false)
        })

        test('Rematch should be destroyed if one leaves the room', async () => {
            const waitForLeaveGame = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => { uWS.socket.once('waiting:getGames', (data: any) => { return resolve(data) }) })
            })
            usersWithSockets[1].socket.emit('waiting:removePlayer', usersWithSockets[1].username);
            const waitForLeaveGameRes = await Promise.all(waitForLeaveGame)
            expect(waitForLeaveGameRes[0].length).toEqual(0)
        })

        test('Rematch should not be created if rematch_open is false', async () => {
            const error = await new Promise<Result<null, any>>((resolve) => usersWithSockets[0].socket.emit('waiting:createRematch', { gameID: gameID }, (data) => { resolve(data) }))
            expect(error.ok === false ? error.error : '').toEqual('REMATCH_NOT_OPEN')
        })

        test('Should not end rematch if game is new', async () => {
            await server.pgPool.query('UPDATE games SET lastplayed=current_timestamp, rematch_open=true WHERE id=$1;', [gameID])
            const ids = await disableRematchOfOldGames(server.pgPool)
            expect(ids).not.toContain(gameID)
        })
        test('Should end rematch if game is new', async () => {
            await server.pgPool.query('UPDATE games SET lastplayed=current_timestamp - interval \'5 minutes\', rematch_open=true WHERE id=$1;', [gameID])
            const ids = await disableRematchOfOldGames(server.pgPool)
            expect(ids).toContain(gameID)
        })
    })
})
