import { registerUserAndReturnCredentials, unregisterUser, userWithCredentials } from '../helpers/userHelper';

describe('Profile Picture', () => {
    let userWithCredentials: userWithCredentials;

    beforeAll(async () => {
        userWithCredentials = await registerUserAndReturnCredentials(testServer, testAgent)
    })

    afterAll(async () => {
        await unregisterUser(testAgent, userWithCredentials)
    })

    test('Change profile picture', async () => {
        const dbResBefore = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picBefore = dbResBefore.rows[0].profilepic

        let response = await testAgent.delete('/gameApi/deleteProfilePicture')
        expect(response.statusCode).toBe(401)

        response = await testAgent.delete('/gameApi/deleteProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(204)

        const dbResAfter = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picAfter = dbResAfter.rows[0].profilepic
        expect(picBefore).not.toEqual(picAfter)
    })

    test('Upload profile picture', async () => {
        const dbResBefore = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picBefore = dbResBefore.rows[0].profilepic

        let response = await testAgent.post('/gameApi/uploadProfilePicture')
            .attach('profilePic', './src/routes/picture.test.image.jpg')
        expect(response.statusCode).toBe(401)

        response = await testAgent.post('/gameApi/uploadProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
            .attach('profilePic', './src/routes/picture.test.image.jpg')
        expect(response.statusCode).toBe(204)

        const dbResAfter = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picAfter = dbResAfter.rows[0].profilepic
        expect(picBefore).not.toEqual(picAfter)
    })

    test('Get profile picture', async () => {
        let response = await testAgent.get('/gameApi/getProfilePicture')
        expect(response.statusCode).toBe(401)

        response = await testAgent.get('/gameApi/getProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(200)
    })
})
