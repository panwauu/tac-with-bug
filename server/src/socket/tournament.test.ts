import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets';
import { closeSockets } from '../test/handleSocket';

describe.skip('Tournament test suite via socket.io', () => {
    let usersWithSockets: UserWithSocket[];

    beforeAll(async () => {
        usersWithSockets = await getUsersWithSockets({ n: 1 });
    })

    afterAll(async () => {
        await closeSockets(usersWithSockets)
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
