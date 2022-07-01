import { TacServer } from '../server';
import supertest from 'supertest';
import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';
import * as mail from '../communicationUtils/email';

describe('Test Suite via Socket.io', () => {
    let agent: supertest.SuperAgentTest, server: TacServer, userWithSocket: userWithCredentialsAndSocket;
    const subscriptionID = 'I-K2P36MWMH55P';

    const spyNewSubscription = jest.spyOn(mail, 'sendNewSubscription')
    const spySubscriptionError = jest.spyOn(mail, 'sendSubscriptionError')

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
        const usersWithSockets = await registerNUsersWithSockets(server, agent, 1);
        userWithSocket = usersWithSockets[0]
    })

    afterEach(() => { jest.clearAllMocks() })

    afterAll(async () => {
        await server.pgPool.query('UPDATE users SET currentsubscription=NULL;')
        await server.pgPool.query('DELETE FROM subscriptions;')
        await unregisterUsersWithSockets(agent, [userWithSocket])
        await server.destroy()
    })

    describe('Test all chat', () => {
        test('get nSubscription should be zero', async () => {
            const promise = new Promise<any>((resolve) => { userWithSocket.socket.once('subscription:nSubscriptions', (data: any) => { return resolve(data) }) })
            userWithSocket.socket.emit('subscription:nSubscriptions');
            const data = await promise;
            expect(data).toBe('0')
        })

        test('get subscription - empty', async () => {
            const promise = new Promise<any>((resolve) => { userWithSocket.socket.once('subscription:get', (data: any) => { return resolve(data) }) })
            userWithSocket.socket.emit('subscription:get');
            const data = await promise;
            expect(data.status).toBe(null)
            expect(data.validuntil).toBe(null)
            expect(data.freelicense).toBe(false)
        })

        test('new subscription - wrong id type', async () => {
            // @ts-ignore
            const data = await new Promise<any>((resolve) => { userWithSocket.socket.emit('subscription:new', false, (response: any) => { resolve(response) }) })
            expect(data.status).toBe(400)
            expect(spySubscriptionError).toBeCalledTimes(0)
        })

        test('new subscription - invalid id', async () => {
            const data = await new Promise<any>((resolve) => { userWithSocket.socket.emit('subscription:new', '1', (response: any) => { resolve(response) }) })
            expect(data.status).toBe(500)
            expect(spySubscriptionError).toBeCalledTimes(1)
        })

        test('new subscription - valid id', async () => {
            const promiseArray = [
                new Promise((resolve) => { userWithSocket.socket.emit('subscription:new', subscriptionID, (response: any) => { resolve(response) }) }),
                new Promise((resolve) => { userWithSocket.socket.once('subscription:get', (data: any) => { return resolve(data) }) })
            ]

            return Promise.all(promiseArray).then((val: any) => {
                expect(val[0].status).toBe(200)
                expect(val[1].status).toBe('running')
                expect(val[1].validuntil).not.toBe(null)
                expect(val[1].freelicense).toBe(false)
                expect(spyNewSubscription).toBeCalledTimes(1)
            })
        })

        test('get nSubscription should be one', async () => {
            const promise = new Promise((resolve) => { userWithSocket.socket.once('subscription:nSubscriptions', (data: any) => { return resolve(data) }) })
            userWithSocket.socket.emit('subscription:nSubscriptions');
            const data = await promise;
            expect(data).toBe('1')
        })

        test('get subscription', async () => {
            const promise = new Promise<any>((resolve) => { userWithSocket.socket.once('subscription:get', (data: any) => { return resolve(data) }) })
            userWithSocket.socket.emit('subscription:get');
            const data = await promise;
            expect(data.status).toBe('running')
            expect(data.validuntil).not.toBe(null)
            expect(data.freelicense).toBe(false)
        })

        test.todo('cancel subscription')
        test.todo('cancel subscription email')
        test.todo('get cancelled subscription')
        /*
        let config = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "Accept-Language": "en_US",
            },
            auth: {
                'username': ClientID,
                'password': PaypalSecret
            },
        }
        let res = await axios.post(`https://api-m.sandbox.paypal.com/v1/oauth2/token?grant_type=client_credentials`, {}, config)
        accessToken = res.data.access_token

        let configCreate = {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Language": "en_US",
                "Authorization": `Bearer ${accessToken}`
            },
        }
        try {
            let resCreateSub = await axios.post(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/`, { "plan_id": "P-8RU48640FT6304941MFJNMUQ" }, configCreate)
            resCreateSub
        }
        catch (err) {
            err.response.data
        }
        */
    })
})
