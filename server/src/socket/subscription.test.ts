import * as mail from '../communicationUtils/email'
import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'

const skipTests = process.env.paypal_Secret == null || process.env.paypal_Client_ID == null

describe.skipIf(skipTests)('Test Suite via Socket.io', () => {
  let userWithSocket: UserWithSocket
  const subscriptionID = 'I-K2P36MWMH55P'

  const spyNewSubscription = vitest.spyOn(mail, 'sendNewSubscription')
  const spySubscriptionError = vitest.spyOn(mail, 'sendSubscriptionError')

  beforeAll(async () => {
    userWithSocket = (await getUsersWithSockets({ n: 1 }))[0]
  })

  afterEach(() => {
    vitest.clearAllMocks()
  })

  afterAll(async () => {
    await closeSockets([userWithSocket])
  })

  describe('Test all chat', () => {
    test('get nSubscription should be zero', async () => {
      const promise = userWithSocket.socket.oncePromise('subscription:nSubscriptions')
      userWithSocket.socket.emit('subscription:nSubscriptions')
      const data = await promise
      expect(data).toBe('0')
    })

    test('get subscription - empty', async () => {
      const promise = userWithSocket.socket.oncePromise('subscription:get')
      userWithSocket.socket.emit('subscription:get')
      const data = await promise
      expect(data.status).toBe(null)
      expect(data.validuntil).toBe(null)
    })

    test('new subscription - wrong id type', async () => {
      const data = await userWithSocket.socket.emitWithAck(5000, 'subscription:new', false as any)
      expect(data.status).toBe(400)
      expect(spySubscriptionError).toBeCalledTimes(0)
    })

    test('new subscription - invalid id', async () => {
      const data = await userWithSocket.socket.emitWithAck(5000, 'subscription:new', '1')
      expect(data.status).toBe(500)
      expect(spySubscriptionError).toBeCalledTimes(1)
    })

    test('new subscription - valid id', async () => {
      const promiseArray = [userWithSocket.socket.emitWithAck(5000, 'subscription:new', subscriptionID), userWithSocket.socket.oncePromise('subscription:get')]

      return Promise.all(promiseArray).then((val: any) => {
        expect(val[0].status).toBe(200)
        expect(val[1].status).toBe('running')
        expect(val[1].validuntil).not.toBe(null)
        expect(spyNewSubscription).toBeCalledTimes(1)
      })
    })

    test('get nSubscription should be one', async () => {
      const promise = userWithSocket.socket.oncePromise('subscription:nSubscriptions')
      userWithSocket.socket.emit('subscription:nSubscriptions')
      const data = await promise
      expect(data).toBe('1')
    })

    test('get subscription', async () => {
      const promise = userWithSocket.socket.oncePromise('subscription:get')
      userWithSocket.socket.emit('subscription:get')
      const data = await promise
      expect(data.status).toBe('running')
      expect(data.validuntil).not.toBe(null)
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
