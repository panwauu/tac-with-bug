import { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition';
import { GameSocketC } from '../../../shared/types/GameNamespaceDefinition';

import { io } from 'socket.io-client';
import { registerGameSocket, registerNUsersWithSockets, unregisterGameSocket, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';

describe('Info sest suite via socket.io', () => {
    let usersWithSockets: userWithCredentialsAndSocket[], socket: GeneralSocketC, gameSocket: GameSocketC;
    const tournamentGameID = 1647;

    beforeAll(async () => {
        usersWithSockets = await registerNUsersWithSockets(test_server, test_agent, 2);
    })

    afterAll(async () => {
        socket.disconnect()
        await unregisterGameSocket(gameSocket)
        await unregisterUsersWithSockets(test_agent, usersWithSockets)
    })

    test('On disconnect the number of connections should be sent', async () => {
        const disconnectPromise = new Promise((resolve) => { usersWithSockets[0].socket.once('disconnect', () => { resolve(null) }) })
        const updatePromise = new Promise<any>((resolve) => { usersWithSockets[1].socket.once('info:serverConnections', (data) => { resolve(data) }) })

        usersWithSockets[0].socket.disconnect()
        await disconnectPromise
        const update = await updatePromise
        expect(update.total).toBe(1)
        expect(update.authenticated).toBe(1)
        expect(update.game).toBe(0)
    })

    test('On new connection the number of connections should be sent', async () => {
        const updatePromise = new Promise<any>((resolve) => { usersWithSockets[1].socket.once('info:serverConnections', (data) => { resolve(data) }) })
        socket = io('http://localhost:1234')
        const connectPromise = new Promise((resolve) => { socket.once('connect', () => { resolve(null) }) })
        const unauthUpdatePromise = new Promise<any>((resolve) => { socket.once('info:serverConnections', (data) => { resolve(data) }) })

        await connectPromise
        const update = await updatePromise
        const updateUnauth = await unauthUpdatePromise
        expect(update.total).toBe(2)
        expect(update.authenticated).toBe(1)
        expect(update.game).toBe(0)
        expect(updateUnauth.total).toBe(2)
        expect(updateUnauth.authenticated).toBe(1)
        expect(updateUnauth.game).toBe(0)
    })

    test.skip('On new game connection the number of connections should be sent', async () => {
        const updatePromise = new Promise<any>((resolve) => { usersWithSockets[1].socket.once('info:serverConnections', (data) => { resolve(data) }) })
        const unauthUpdatePromise = new Promise<any>((resolve) => { socket.once('info:serverConnections', (data) => { resolve(data) }) })
        gameSocket = await registerGameSocket(tournamentGameID, usersWithSockets[1].token)

        const update = await updatePromise
        const updateUnauth = await unauthUpdatePromise
        expect(update.total).toBe(2)
        expect(update.authenticated).toBe(1)
        expect(update.game).toBe(1)
        expect(updateUnauth.total).toBe(2)
        expect(updateUnauth.authenticated).toBe(1)
        expect(updateUnauth.game).toBe(1)
    })
})
