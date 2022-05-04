import { TacServer } from '../server';
import supertest from 'supertest';
import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';

describe('Test Suite via Socket.io', () => {
    let agent: supertest.SuperAgentTest, server: TacServer, usersWithSockets: userWithCredentialsAndSocket[];

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
        usersWithSockets = await registerNUsersWithSockets(server, agent, 1);
    })

    afterAll(async () => {
        await unregisterUsersWithSockets(agent, usersWithSockets)
        await server.destroy()
    })

    test('Should return table of last tournaments', async () => {
        const table = await new Promise<any>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:loadTable', { filter: null, first: 1, limit: 5 }, (data) => {
                resolve(data.data)
            })
        })
        expect(table.total).toBeGreaterThan(5)
        expect(table.tournaments.length).toBe(5)
    })

    test('Should return the last Tournament Winners', async () => {
        const winners = await new Promise<any>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:winners:get', (winners) => {
                resolve(winners.data)
            })
        })
        expect(winners.length).toBe(3)
    })
})