import { TacServer } from '../server';
import supertest from 'supertest';
import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';
import { AckData } from '../../../shared/types/GeneralNamespaceDefinition';
import { gameForOverview } from '../../../shared/types/typesDBgame';

describe('Games test suite via socket.io', () => {
    let userWithSocket: userWithCredentialsAndSocket, agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
        userWithSocket = (await registerNUsersWithSockets(server, agent, 1))[0];
        console.log(userWithSocket.token)
    })

    afterAll(async () => {
        await unregisterUsersWithSockets(agent, [userWithSocket])
        await server.destroy()
    })

    describe('Test games events', () => {
        test('Get games summary', async () => {
            const gamesResult = new Promise((resolve) => {
                userWithSocket.socket.once('games:getGames', (data: any) => { resolve(data) })
            })

            userWithSocket.socket.emit('games:getSummary')

            const res = await gamesResult
            expect(res).toEqual({ open: 0, aborted: 0, won: 0, lost: 0, team: 0, history: [], runningGames: [] })
        })

        test('Table data should return error when username is invalid', async () => {
            const response = await new Promise<AckData<{
                games: gameForOverview[];
                nEntries: number;
            }>>((resolve) => userWithSocket.socket.emit('games:getTableData', { first: 0, limit: 10, sortField: 'created', sortOrder: 1, username: 'a' }, (data) => { resolve(data) }))
            expect(response.status).toBe(500)
        })

        test('Table data should be possible for user himself', async () => {
            const response = await new Promise<AckData<{
                games: gameForOverview[];
                nEntries: number;
            }>>((resolve) => userWithSocket.socket.emit('games:getTableData', { first: 0, limit: 10, sortField: 'created', sortOrder: 1 }, (data) => { resolve(data) }))
            expect(response.status).toBe(200)
            expect(response.data?.games).toEqual([])
            expect(response.data?.nEntries).toEqual(0)
        })

        test.skip('Table data should be possible for real user', async () => {
            const response = await new Promise<AckData<{
                games: gameForOverview[];
                nEntries: number;
            }>>((resolve) => userWithSocket.socket.emit('games:getTableData', { first: 0, limit: 10, sortField: 'created', sortOrder: 1, username: 'UserA' }, (data) => { resolve(data) }))
            expect(response.status).toBe(200)
            expect(response.data?.games.length).toBe(10)
            expect(response.data?.nEntries).toBeGreaterThan(0)
        })
    })

    test.todo('Test getRunningGames')
})
