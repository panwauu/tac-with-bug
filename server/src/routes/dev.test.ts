import { getUserWithSocket, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'

describe('Moderation test suite', () => {
  let adminUser: UserWithSocket
  let nonAdminUser: UserWithSocket

  beforeAll(async () => {
    adminUser = await getUserWithSocket(1)
    nonAdminUser = await getUserWithSocket(2)
  })

  afterAll(async () => {
    await closeSockets([adminUser, nonAdminUser])
  })

  describe('GET /moderation', () => {
    test('should return 401 if unauthorized', async () => {
      const response = await testAgent.get('/gameApi/moderation')
      expect(response.statusCode).toBe(401)
    })

    test('should return 401 if non-admin', async () => {
      const response = await testAgent.get('/gameApi/moderation').set({ Authorization: nonAdminUser.authHeader })
      expect(response.statusCode).toBe(401)
    })

    test('should return all moderation data when no query provided', async () => {
      const response = await testAgent.get('/gameApi/moderation').set({ Authorization: adminUser.authHeader })
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(7)
    })

    test('should filter moderation data by userid', async () => {
      const response = await testAgent.get('/gameApi/moderation?userid=1').set({ Authorization: adminUser.authHeader })
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
    })

    test('should filter moderation data by email', async () => {
      const response = await testAgent.get('/gameApi/moderation?email=user.b@fake-mail.de').set({ Authorization: adminUser.authHeader })
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
    })
  })

  describe('POST /moderation (add moderation data)', () => {
    test('should return 401 if unauthorized', async () => {
      const response = await testAgent.post('/gameApi/moderation').send({ username: 'UserB', reason: 'Violation of rules' })
      expect(response.statusCode).toBe(401)
    })

    test('should return 401 if unauthorized', async () => {
      const response = await testAgent.post('/gameApi/moderation').set({ Authorization: nonAdminUser.authHeader }).send({ username: 'UserB', reason: 'Violation of rules' })
      expect(response.statusCode).toBe(401)
    })

    test('should return 500 for validation error (missing required field)', async () => {
      const response = await testAgent.post('/gameApi/moderation').set({ Authorization: adminUser.authHeader }).send({ username: 'UserB' })
      expect(response.statusCode).toBe(422)
    })

    test('should return 500 when user is not found', async () => {
      const response = await testAgent
        .post('/gameApi/moderation')
        .set({ Authorization: adminUser.authHeader })
        .send({ username: 'UserThatDoesNotExist', reason: 'Violation of rules' })
      expect(response.statusCode).toBe(500)
    })

    test('should successfully add moderation data', async () => {
      const response = await testAgent.post('/gameApi/moderation').set({ Authorization: adminUser.authHeader }).send({ username: 'UserB', reason: 'Violation of rules' })
      expect(response.statusCode).toBe(200)
      expect(response.body.email).toBe('user.b@fake-mail.de')
      expect(response.body.userid).toBe(2)
      expect(response.body.reason).toBe('Violation of rules')
      expect(response.body.insertedByUserId).toBe(1)
      expect(new Date(response.body.blockeduntil) > new Date()).toBeTruthy()
    })
  })

  describe('DELETE /moderation (remove moderation data)', () => {
    test('should return 401 if unauthorized', async () => {
      const response = await testAgent.delete('/gameApi/moderation').send({ username: 'UserB' })
      expect(response.statusCode).toBe(401)
    })

    test('should return 401 if not-admin', async () => {
      const response = await testAgent.delete('/gameApi/moderation').set({ Authorization: nonAdminUser.authHeader }).send({ username: 'UserB' })
      expect(response.statusCode).toBe(401)
    })

    test('should return 500 for validation error (missing username)', async () => {
      const response = await testAgent.delete('/gameApi/moderation').set({ Authorization: adminUser.authHeader }).send({})
      expect(response.statusCode).toBe(422)
    })

    test('should return 500 when user is not found', async () => {
      const response = await testAgent.delete('/gameApi/moderation').set({ Authorization: adminUser.authHeader }).send({ username: 'UserThatDoesNotExist' })
      expect(response.statusCode).toBe(500)
    })

    test('should successfully remove moderation data', async () => {
      const response = await testAgent.delete('/gameApi/moderation').set({ Authorization: adminUser.authHeader }).send({ username: 'UserP' })
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      for (const entry of response.body) {
        expect(new Date(entry.blockeduntil) <= new Date()).toBeTruthy()
      }
    })
  })
})
