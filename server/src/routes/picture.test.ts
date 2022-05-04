import { TacServer } from '../server';
import supertest from 'supertest';
import { registerUserAndReturnCredentials, unregisterUser, userWithCredentials } from '../helpers/userHelper';

describe('Profile Picture', () => {
    let userWithCredentials: userWithCredentials, agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)

        userWithCredentials = await registerUserAndReturnCredentials(server, agent)
    })

    afterAll(async () => {
        await unregisterUser(agent, userWithCredentials)
        await server.destroy()
    })

    test('Change profile picture', async () => {
        const dbResBefore = await server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picBefore = dbResBefore.rows[0].profilepic

        let response = await agent.delete('/gameApi/deleteProfilePicture')
        expect(response.statusCode).toBe(401)

        response = await agent.delete('/gameApi/deleteProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(204)

        const dbResAfter = await server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picAfter = dbResAfter.rows[0].profilepic
        expect(picBefore).not.toEqual(picAfter)
    })

    test('Upload profile picture', async () => {
        const dbResBefore = await server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picBefore = dbResBefore.rows[0].profilepic

        let response = await agent.post('/gameApi/uploadProfilePicture')
            .attach('profilePic', './src/routes/picture.test.image.jpg')
        expect(response.statusCode).toBe(401)

        response = await agent.post('/gameApi/uploadProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
            .attach('profilePic', './src/routes/picture.test.image.jpg')
        expect(response.statusCode).toBe(204)

        const dbResAfter = await server.pgPool.query('SELECT * FROM users WHERE username = $1;', [userWithCredentials.username])
        const picAfter = dbResAfter.rows[0].profilepic
        expect(picBefore).not.toEqual(picAfter)
    })

    test('Get profile picture', async () => {
        let response = await agent.get('/gameApi/getProfilePicture')
        expect(response.statusCode).toBe(401)

        response = await agent.get('/gameApi/getProfilePicture')
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(200)
    })
})