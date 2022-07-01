import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';

describe.skip('Tournament test suite via socket.io', () => {
    let usersWithSockets: userWithCredentialsAndSocket[];

    beforeAll(async () => {
        usersWithSockets = await registerNUsersWithSockets(test_server, test_agent, 1);
    })

    afterAll(async () => {
        await unregisterUsersWithSockets(test_agent, usersWithSockets)
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
