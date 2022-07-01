import { registerUserAndReturnCredentials, unregisterUser, userWithCredentials } from '../helpers/userHelper';

describe('Profile Picture', () => {
    let userWithCredentials: userWithCredentials;

    beforeAll(async () => {
        userWithCredentials = await registerUserAndReturnCredentials(test_server, test_agent)
    })

    afterAll(async () => {
        await unregisterUser(test_agent, userWithCredentials)
    })

    test('Change profile picture', async () => {
        const dbResBefore = await test_server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picBefore = dbResBefore.rows[0].profilepic

        let response = await test_agent.delete('/gameApi/deleteProfilePicture')
        expect(response.statusCode).toBe(401)

        response = await test_agent.delete('/gameApi/deleteProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(204)

        const dbResAfter = await test_server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picAfter = dbResAfter.rows[0].profilepic
        expect(picBefore).not.toEqual(picAfter)
    })

    test('Upload profile picture', async () => {
        const dbResBefore = await test_server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picBefore = dbResBefore.rows[0].profilepic

        let response = await test_agent.post('/gameApi/uploadProfilePicture')
            .attach('profilePic', './src/routes/picture.test.image.jpg')
        expect(response.statusCode).toBe(401)

        response = await test_agent.post('/gameApi/uploadProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
            .attach('profilePic', './src/routes/picture.test.image.jpg')
        expect(response.statusCode).toBe(204)

        const dbResAfter = await test_server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picAfter = dbResAfter.rows[0].profilepic
        expect(picBefore).not.toEqual(picAfter)
    })

    test('Get profile picture', async () => {
        let response = await test_agent.get('/gameApi/getProfilePicture')
        expect(response.statusCode).toBe(401)

        response = await test_agent.get('/gameApi/getProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(200)
    })
})
