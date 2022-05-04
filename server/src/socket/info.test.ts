import { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition';
import { GameSocketC } from '../../../shared/types/GameNamespaceDefinition';

import { TacServer } from '../server';
import { io } from 'socket.io-client';
import supertest from 'supertest';
import { registerGameSocket, registerNUsersWithSockets, unregisterGameSocket, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';

describe('Test Suite via Socket.io', () => {
    let usersWithSockets: userWithCredentialsAndSocket[], agent: supertest.SuperAgentTest, server: TacServer, socket: GeneralSocketC, gameSocket: GameSocketC;
    const tournamentGameID = 1647;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
        usersWithSockets = await registerNUsersWithSockets(server, agent, 2);
    })

    afterAll(async () => {
        socket.disconnect()
        await unregisterGameSocket(gameSocket)
        await unregisterUsersWithSockets(agent, usersWithSockets)
        await server.destroy()
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

    test('On new game connection the number of connections should be sent', async () => {
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