import { registerUserAndReturnCredentials, unregisterUser, userWithCredentials } from '../helpers/userHelper';

describe('Profile Picture', () => {
    let userWithCredentials: userWithCredentials;

    beforeAll(async () => {
        userWithCredentials = await registerUserAndReturnCredentials(testServer, testAgent)
    })

    afterAll(async () => {
        await unregisterUser(testAgent, userWithCredentials)
    })

    describe('Set Locale', () => {
        test('Unauthorized', async () => {
            const response = await testAgent.post('/gameApi/setLocale')
            expect(response.statusCode).toBe(401)
        })

        test('Unsuccessful request', async () => {
            const response = await testAgent.post('/gameApi/setLocale')
                .set({ Authorization: userWithCredentials.authHeader })
            expect(response.statusCode).toBe(422)
            expect(response.body.message).toStrictEqual('Validation Failed')
            expect(JSON.stringify(response.body.details)).toContain('\'locale\' is required')
        })

        test('Successful request', async () => {
            const response = await testAgent.post('/gameApi/setLocale')
                .set({ Authorization: userWithCredentials.authHeader })
                .send({ locale: 'ru' })
            expect(response.statusCode).toBe(204)
            const newLocale = await testServer.pgPool.query('SELECT locale FROM users WHERE username=$1;', [userWithCredentials.username])
            expect(newLocale.rows[0].locale).toBe('ru')
        })
    })

    describe('Set Color Blindness Flag', () => {
        test('Unauthorized', async () => {
            const response = await testAgent.post('/gameApi/setColorBlindnessFlag')
            expect(response.statusCode).toBe(401)
        })

        test('Unsuccessful request', async () => {
            const response = await testAgent.post('/gameApi/setColorBlindnessFlag')
                .set({ Authorization: userWithCredentials.authHeader })
            expect(response.statusCode).toBe(422)
            expect(response.body.message).toStrictEqual('Validation Failed')
            expect(JSON.stringify(response.body.details)).toContain('\'colorBlindnessFlag\' is required')
        })

        test('Successful request', async () => {
            const response = await testAgent.post('/gameApi/setColorBlindnessFlag')
                .set({ Authorization: userWithCredentials.authHeader })
                .send({ colorBlindnessFlag: true })
            expect(response.statusCode).toBe(204)
            const dbRes = await testServer.pgPool.query('SELECT color_blindness_flag FROM users WHERE username=$1;', [userWithCredentials.username])
            expect(dbRes.rows[0].color_blindness_flag).toBe(true)
        })
    })

    describe('Game Default Positions', () => {
        test('Unauthorized', async () => {
            const responseGet = await testAgent.get('/gameApi/getGameDefaultPositions')
            expect(responseGet.statusCode).toBe(401)
            const responseSet = await testAgent.post('/gameApi/setGameDefaultPositions')
            expect(responseSet.statusCode).toBe(401)
        })

        test('Unsuccessful request', async () => {
            const response = await testAgent.post('/gameApi/setGameDefaultPositions')
                .set({ Authorization: userWithCredentials.authHeader })
            expect(response.statusCode).toBe(422)
            expect(response.body.message).toStrictEqual('Validation Failed')
            expect(JSON.stringify(response.body.details)).toContain('\'gameDefaultPositions\' is required')

            const responseInvalidSmall = await testAgent.post('/gameApi/setGameDefaultPositions')
                .set({ Authorization: userWithCredentials.authHeader })
                .send({ gameDefaultPositions: [-2, -2] })
            expect(responseInvalidSmall.statusCode).toBe(409)

            const responseInvalidLarge1 = await testAgent.post('/gameApi/setGameDefaultPositions')
                .set({ Authorization: userWithCredentials.authHeader })
                .send({ gameDefaultPositions: [0, 6] })
            expect(responseInvalidLarge1.statusCode).toBe(409)

            const responseInvalidLarge2 = await testAgent.post('/gameApi/setGameDefaultPositions')
                .set({ Authorization: userWithCredentials.authHeader })
                .send({ gameDefaultPositions: [4, 4] })
            expect(responseInvalidLarge2.statusCode).toBe(409)
        })

        test('Successful Set', async () => {
            const response = await testAgent.post('/gameApi/setGameDefaultPositions')
                .set({ Authorization: userWithCredentials.authHeader })
                .send({ gameDefaultPositions: [-1, 2] })
            expect(response.statusCode).toBe(204)
            const dbRes = await testServer.pgPool.query('SELECT game_default_position FROM users WHERE username=$1;', [userWithCredentials.username])
            expect(dbRes.rows[0].game_default_position).toStrictEqual([-1, 2])
        })

        test('Successful Get', async () => {
            const response = await testAgent.get('/gameApi/getGameDefaultPositions')
                .set({ Authorization: userWithCredentials.authHeader })
            expect(response.statusCode).toBe(200)
            expect(response.body).toStrictEqual([-1, 2])
        })
    })
})
