import type { GameSocketC } from '../../../shared/types/GameNamespaceDefinition';

import { TacServer } from '../server';
import supertest from 'supertest';
import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket, registerGameSocket, unregisterGameSocket } from '../helpers/userHelper';

describe.skip('Game test suite via socket.io', () => {
    let usersWithSockets: userWithCredentialsAndSocket[], agent: supertest.SuperAgentTest, server: TacServer, gameBefore: any;
    const gameID = 96;
    const gameOskar = { playerIndex: 2, userid: 4 }
    const gameSophia = { playerIndex: 3, userid: 7 }

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
        usersWithSockets = await registerNUsersWithSockets(server, agent, 3);
        await server.pgPool.query('UPDATE users_to_games SET userid = $1 WHERE player_index = $2 AND gameid = $3;', [usersWithSockets[0].id, gameOskar.playerIndex, gameID])
        await server.pgPool.query('UPDATE users_to_games SET userid = $1 WHERE player_index = $2 AND gameid = $3;', [usersWithSockets[1].id, gameSophia.playerIndex, gameID])
        await server.pgPool.query('UPDATE games SET status=\'running\' WHERE id = $1;', [gameID])
        gameBefore = await server.pgPool.query('SELECT game FROM games WHERE id = $1;', [gameID]).then((r) => r.rows[0].game)
    })

    afterAll(async () => {
        await server.pgPool.query('UPDATE users_to_games SET userid = $1 WHERE player_index = $2 AND gameid = $3;', [gameOskar.userid, gameOskar.playerIndex, gameID])
        await server.pgPool.query('UPDATE users_to_games SET userid = $1 WHERE player_index = $2 AND gameid = $3;', [gameSophia.userid, gameSophia.playerIndex, gameID])
        await server.pgPool.query('UPDATE games SET status=\'aborted\', game=$2, rematch_open=false WHERE id = $1;', [gameID, JSON.stringify(gameBefore)])
        await unregisterUsersWithSockets(agent, usersWithSockets)
        await server.destroy()
    })

    describe('Test invalid connection', () => {
        let gameSocket: GameSocketC;

        afterEach(async () => {
            await unregisterGameSocket(gameSocket)
        })

        test('Test with invalid game', async () => {
            await expect(registerGameSocket('test', usersWithSockets[0].token)).rejects.toBe(undefined)
        })

        test('Test with invalid token', async () => {
            await expect(registerGameSocket(1000, 'test')).rejects.toBe(undefined)
        })
    })

    describe('Test valid connection', () => {
        let gameSocket: GameSocketC, anotherGameSocket: GameSocketC;

        afterEach(async () => {
            await unregisterGameSocket(gameSocket)
            await unregisterGameSocket(anotherGameSocket)
        })

        test('Test with own game', async () => {
            gameSocket = await registerGameSocket(gameID, usersWithSockets[0].token)
        })

        test('Test with other tournament game', async () => {
            gameSocket = await registerGameSocket(2660, usersWithSockets[0].token)
        })
    })

    /*describe('Test dealCards', () => {
        let gameSocket: GameSocketC, interval: any;

        beforeAll(async () => {
            const gameCopy = cloneDeep(gameBefore)
            gameCopy.cardsWithMoves = []
            gameCopy.cards.players.forEach((_: any, i: number) => gameCopy.cards.players[i] = [])
            await server.pgPool.query('UPDATE games SET game=$2 WHERE id = $1;', [gameID, JSON.stringify(gameCopy)])
            await new Promise((resolve) => setTimeout(() => resolve(null), 200)) // Needed to fix test
        })

        afterAll(async () => {
            clearInterval(interval);
            await unregisterGameSocket(gameSocket);
        })

        test('Register player and expect dealCards', async () => {
            gameSocket = initiateGameSocket(gameID, usersWithSockets[0].token)
            let nUpdates = 0;
            let updateData: any = null;
            gameSocket.on('update', (data) => { updateData = data; nUpdates += 1 })


            const promiseArray = [
                new Promise<any>((resolve) => gameSocket.once('game:online-players', (data) => resolve(data))),
                new Promise<any>((resolve) => interval = setInterval(() => {
                    if (nUpdates >= 2) {
                        resolve(updateData);
                        clearInterval(interval)
                    }
                }, 20)),
            ]
            await waitForGameSocketConnection(gameSocket)
            const result = await Promise.all(promiseArray)
            expect(result[0].onlineGamePlayers).toEqual([gameOskar.playerIndex])
            expect(result[0].nWatchingPlayers).toEqual(0)
            expect(result[0].watchingPlayerNames).toEqual([])
            expect(generateGameSnapshot(result[1])).toMatchSnapshot()
            expect(result[1].ownCards.length).toBeGreaterThan(0)
        })
    })

    describe('Test complete flow with all events', () => {
        let gameSocket0: GameSocketC, gameSocket1: GameSocketC;

        afterAll(async () => {
            await unregisterGameSocket(gameSocket0)
            await unregisterGameSocket(gameSocket1)
        })

        test('Register first player', async () => {
            await new Promise<void>((resolve) => { setTimeout(() => { resolve() }, 500) })
            gameSocket0 = initiateGameSocket(gameID, usersWithSockets[0].token)
            const promiseArray = [
                new Promise<any>((resolve) => gameSocket0.once('game:online-players', (data) => resolve(data))),
                new Promise<any>((resolve) => gameSocket0.once('update', (data) => resolve(data))),
            ]
            await waitForGameSocketConnection(gameSocket0)
            const result = await Promise.all(promiseArray)
            expect(result[0].onlineGamePlayers).toEqual([gameOskar.playerIndex])
            expect(result[0].nWatchingPlayers).toEqual(0)
            expect(result[0].watchingPlayerNames).toEqual([])
            expect(generateGameSnapshot(result[1])).toMatchSnapshot();
        })

        test('Register second player', async () => {
            gameSocket1 = initiateGameSocket(gameID, usersWithSockets[1].token)
            const promiseArray = [
                new Promise<any>((resolve) => gameSocket0.once('game:online-players', (data) => resolve(data))),
                new Promise<any>((resolve) => gameSocket1.once('game:online-players', (data) => resolve(data))),
                new Promise<any>((resolve) => gameSocket1.once('update', (data) => resolve(data))),
            ]
            await waitForGameSocketConnection(gameSocket1)
            const result = await Promise.all(promiseArray)
            expect(result[0].onlineGamePlayers.sort()).toEqual([gameOskar.playerIndex, gameSophia.playerIndex].sort())
            expect(result[0].nWatchingPlayers).toEqual(0)
            expect(result[0].watchingPlayerNames).toEqual([])
            expect(result[1].onlineGamePlayers.sort()).toEqual([gameOskar.playerIndex, gameSophia.playerIndex].sort())
            expect(result[1].nWatchingPlayers).toEqual(0)
            expect(result[1].watchingPlayerNames).toEqual([])
            expect(generateGameSnapshot(result[2])).toMatchSnapshot();
        })

        test('Post move', async () => {
            const promiseArray = [
                new Promise<any>((resolve) => gameSocket0.once('update', (data) => resolve(data))),
                new Promise<any>((resolve) => gameSocket1.once('update', (data) => resolve(data))),
            ]
            gameSocket1.emit('postMove', [3, 0, 'beenden'])
            const result = await Promise.all(promiseArray)
            expect(generateGameSnapshot(result[0])).toMatchSnapshot();
            expect(generateGameSnapshot(result[1])).toMatchSnapshot();
            const game = result[0]
            expect(game.status).toBe('won-0')
            expect(game.rematch_open).toBe(true)
        })

        test('Does emit onlinePlayers to gameSocket1 when gameSocket0 disconnects', async () => {
            const promiseArray = [
                new Promise<any>((resolve) => gameSocket1.once('game:online-players', (data) => resolve(data))),
            ]
            gameSocket0.disconnect()
            const result = await Promise.all(promiseArray);
            expect(result[0].onlineGamePlayers).toEqual([gameSophia.playerIndex])
            expect(result[0].nWatchingPlayers).toEqual(0)
            expect(result[0].watchingPlayerNames).toEqual([])
        })

        test('Unregister last player', async () => {
            gameSocket1.disconnect()
        })
    })*/

    test.todo('Test watching mode - online Players')
})

/*function generateGameSnapshot(game: any) {
    game.lastPlayed = 0;
    game.players.forEach((_: any, i: number) => game.players[i].name = `username${i}`)
    game.statistic.forEach((_: any, i: number) => game.statistic[i].actions.timePlayed = 0)
    return JSON.stringify(game)
}*/
