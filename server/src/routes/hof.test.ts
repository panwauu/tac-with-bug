import { TacServer } from '../server';
import supertest from 'supertest';
import { registerUserAndReturnCredentials, unregisterUser, userWithCredentials } from '../helpers/userHelper';

describe('Leaders Test Suite', () => {
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

    test('Get HOF data', async () => {
        const response = await agent.get('/gameApi/getHofData/')
        expect(response.statusCode).toBe(200)
        expect(response.body.verlag).toContain('Takai')
        expect(response.body.family).toContain('Annette')
        expect(response.body.family).toContain('Sophia')
        expect(response.body.translation).toContain('MaAd')
        expect(response.body.spende).toContain('Sophia')
        expect(response.body.spende).toContain('Martina')
    })
})
