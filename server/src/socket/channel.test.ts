import io from 'socket.io-client'
import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets';
import { closeSockets } from '../test/handleSocket';
import { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition';

describe('Channel test suite via socket.io', () => {
    let usersWithSockets: UserWithSocket[], socket: GeneralSocketC;

    beforeAll(async () => {
        usersWithSockets = await getUsersWithSockets({ n: 2 });
        socket = io('http://localhost:1234') as any;
        await new Promise((resolve) => { socket.on('connect', () => { resolve(null) }) })
    })

    afterAll(async () => {
        await closeSockets([...usersWithSockets, socket])
    })

    describe('Test channel communication', () => {
        let nMessagesBefore: number;

        test('Should load the general channel', async () => {
            const loadData = await new Promise<any>((resolve) => {
                usersWithSockets[0].socket.emit('channel:load', { channel: 'general' }, (data) => {
                    resolve(data)
                })
            })
            expect(loadData.status).toBe(200)
            expect(loadData.data.channel).toBe('general')
            nMessagesBefore = loadData.data.messages.length
        })

        test('Should not send for unauthenticated user', async () => {
            const promise = await new Promise<any>((resolve) => {
                socket.emit('channel:sendMessage', { channel: 'general', body: 'test' }, (data) => {
                    resolve(data)
                })
            })
            expect(promise.status).toBe(500)
        })

        test('Should send to the general channel and send update to all', async () => {
            const promises = usersWithSockets.map((uWS) => {
                return new Promise<any>((resolve) => {
                    uWS.socket.on('channel:update', (data) => { resolve(data) })
                })
            })
            const promiseSend = new Promise<any>((resolve) => {
                usersWithSockets[0].socket.emit('channel:sendMessage', { channel: 'general', body: 'test' }, (data) => {
                    resolve(data)
                })
            })
            const results = await Promise.all([promiseSend].concat(promises))
            expect(results[0].status).toBe(200)
            for (let i = 1; i < results.length; i++) {
                expect(results[i].channel).toBe('general')
                expect(results[i].messages.length).toBe(nMessagesBefore + 1)
            }
        })
    })
})
