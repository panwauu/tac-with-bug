import { TacServer } from '../server';
import supertest from 'supertest';
import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';
import { AckData } from '../../../shared/types/GeneralNamespaceDefinition';
import { friend } from '../../../shared/types/typesFriends';

describe('Friends test suite via socket.io', () => {
    let usersWithSockets: userWithCredentialsAndSocket[], agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
        usersWithSockets = await registerNUsersWithSockets(server, agent, 3);
    })

    afterAll(async () => {
        await unregisterUsersWithSockets(agent, usersWithSockets)
        await server.destroy()
    })

    test('Should fail for invalid username', async () => {
        const response = await new Promise<AckData<friend[]>>((resolve) => usersWithSockets[0].socket.emit('friends:ofUser', 'a', (data) => { resolve(data) }))
        expect(response.status).toBe(500)
    })

    test('Should have no friends', async () => {
        const response = await new Promise<AckData<friend[]>>((resolve) => usersWithSockets[0].socket.emit('friends:ofUser', usersWithSockets[0].username, (data) => { resolve(data) }))
        expect(response.status).toBe(200)
        expect(response.data).toEqual([])
    })

    test('Player should not be able to befriend himself', async () => {
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[0].socket.emit('friends:request', usersWithSockets[0].username, (data) => { resolve(data) }))
        expect(response.status).toBe(500)
    })

    test('Player should not be able to befriend invalid player', async () => {
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[0].socket.emit('friends:request', 'a', (data) => { resolve(data) }))
        expect(response.status).toBe(500)
    })

    test('Should be able to request friendship from other player and alert player', async () => {
        const promises: [Promise<friend[]>, Promise<friend[]>, Promise<{ username: string }>] = [
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:new-request', (data) => { resolve(data) })),
        ]
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[0].socket.emit('friends:request', usersWithSockets[1].username, (data) => { resolve(data) }))
        const result = await Promise.all(promises)
        expect(response.status).toBe(200)
        expect(result[0].length).toBe(1)
        expect(result[0][0].username).toEqual(usersWithSockets[1].username)
        expect(result[0][0].status).toEqual('to')
        expect(result[1].length).toBe(1)
        expect(result[1][0].username).toEqual(usersWithSockets[0].username)
        expect(result[1][0].status).toEqual('from')
        expect(result[2].username).toEqual(usersWithSockets[0].username)
    })

    test('Uninvolved player should not see the requests of other players', async () => {
        const response = await new Promise<AckData<friend[]>>((resolve) => usersWithSockets[2].socket.emit('friends:ofUser', usersWithSockets[0].username, (data) => { resolve(data) }))
        expect(response.status).toBe(200)
        expect(response.data).toEqual([])
    })

    test('Involved player should also not see the requests of other players - to', async () => {
        const response = await new Promise<AckData<friend[]>>((resolve) => usersWithSockets[1].socket.emit('friends:ofUser', usersWithSockets[0].username, (data) => { resolve(data) }))
        expect(response.status).toBe(200)
        expect(response.data?.length).toBe(0)
    })

    test('Involved player should see the requests of other players - from', async () => {
        const response = await new Promise<AckData<friend[]>>((resolve) => usersWithSockets[0].socket.emit('friends:ofUser', usersWithSockets[1].username, (data) => { resolve(data) }))
        expect(response.status).toBe(200)
        expect(response.data?.length).toBe(0)
    })

    test('Player should not be able to confirm a friendship which was initiated by himself', async () => {
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[0].socket.emit('friends:confirm', usersWithSockets[1].username, (data) => { resolve(data) }))
        expect(response.status).toBe(500)
    })

    test('Player should not be able to confirm a friendship where there is none', async () => {
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[2].socket.emit('friends:confirm', usersWithSockets[1].username, (data) => { resolve(data) }))
        expect(response.status).toBe(500)
    })

    test('Should be able to confirm friendship', async () => {
        const promises: [Promise<friend[]>, Promise<friend[]>, Promise<{ username: string }>] = [
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:friend-confirmed', (data) => { resolve(data) })),
        ]
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[1].socket.emit('friends:confirm', usersWithSockets[0].username, (data) => { resolve(data) }))
        const result = await Promise.all(promises)
        expect(response.status).toBe(200)
        expect(result[0].length).toBe(1)
        expect(result[0][0].username).toEqual(usersWithSockets[1].username)
        expect(result[0][0].status).toEqual('done')
        expect(result[1].length).toBe(1)
        expect(result[1][0].username).toEqual(usersWithSockets[0].username)
        expect(result[1][0].status).toEqual('done')
        expect(result[2].username).toEqual(usersWithSockets[1].username)
    })

    test('Uninvolved player should see consented friendhips of others', async () => {
        const response = await new Promise<AckData<friend[]>>((resolve) => usersWithSockets[2].socket.emit('friends:ofUser', usersWithSockets[0].username, (data) => { resolve(data) }))
        expect(response.status).toBe(200)
        expect(response.data?.length).toBe(1)
        expect(response.data?.[0].username).toEqual(usersWithSockets[1].username)
        expect(response.data?.[0].status).toEqual('done')
        expect(typeof response.data?.[0].date).toEqual('string')
    })

    test('Uninvolved player should not be able to cancel unexisting friendship', async () => {
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[2].socket.emit('friends:cancel', usersWithSockets[0].username, (data) => { resolve(data) }))
        expect(response.status).toBe(500)
    })

    test('Should be able to cancel friendship', async () => {
        const playerToCancel = Math.random() > 0.5 ? 1 : 0
        const playerToBeCanceled = playerToCancel === 1 ? 0 : 1
        const promises: [Promise<friend[]>, Promise<friend[]>, Promise<{ username: string }>] = [
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[playerToBeCanceled].socket.once('friends:friend-cancelled', (data) => { resolve(data) })),
        ]
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[playerToCancel].socket.emit('friends:cancel', usersWithSockets[playerToBeCanceled].username, (data) => { resolve(data) }))
        const result = await Promise.all(promises)
        expect(response.status).toBe(200)
        expect(result[0].length).toBe(0)
        expect(result[1].length).toBe(0)
        expect(result[2].username).toEqual(usersWithSockets[playerToCancel].username)
    })

    test('Friendship should not be visible anymore', async () => {
        const response = await new Promise<AckData<friend[]>>((resolve) => usersWithSockets[Math.floor(Math.random() * 3)].socket.emit('friends:ofUser', usersWithSockets[0].username, (data) => { resolve(data) }))
        expect(response.status).toBe(200)
        expect(response.data?.length).toBe(0)
    })

    test('User should be able to withdraw request', async () => {
        const promisesRequest: [Promise<friend[]>, Promise<friend[]>, Promise<{ username: string }>] = [
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:new-request', (data) => { resolve(data) })),
        ]
        const responseRequest = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[0].socket.emit('friends:request', usersWithSockets[1].username, (data) => { resolve(data) }))
        await Promise.all(promisesRequest)
        expect(responseRequest.status).toBe(200)

        const promises: [Promise<friend[]>, Promise<friend[]>, Promise<{ username: string }>] = [
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:friend-withdrew', (data) => { resolve(data) })),
        ]
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[0].socket.emit('friends:cancel', usersWithSockets[1].username, (data) => { resolve(data) }))
        const result = await Promise.all(promises)
        expect(response.status).toBe(200)
        expect(result[0].length).toBe(0)
        expect(result[1].length).toBe(0)
        expect(result[2].username).toEqual(usersWithSockets[0].username)
    })

    test('User should be able to decline request', async () => {
        const promisesRequest: [Promise<friend[]>, Promise<friend[]>, Promise<{ username: string }>] = [
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:new-request', (data) => { resolve(data) })),
        ]
        const responseRequest = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[0].socket.emit('friends:request', usersWithSockets[1].username, (data) => { resolve(data) }))
        await Promise.all(promisesRequest)
        expect(responseRequest.status).toBe(200)

        const promises: [Promise<friend[]>, Promise<friend[]>, Promise<{ username: string }>] = [
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[1].socket.once('friends:update', (data) => { resolve(data) })),
            new Promise((resolve) => usersWithSockets[0].socket.once('friends:friend-declined', (data) => { resolve(data) })),
        ]
        const response = await new Promise<AckData<boolean>>((resolve) => usersWithSockets[1].socket.emit('friends:cancel', usersWithSockets[0].username, (data) => { resolve(data) }))
        const result = await Promise.all(promises)
        expect(response.status).toBe(200)
        expect(result[0].length).toBe(0)
        expect(result[1].length).toBe(0)
        expect(result[2].username).toEqual(usersWithSockets[1].username)
    })
})
