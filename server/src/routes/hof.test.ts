import { TacServer } from '../server';
import supertest from 'supertest';

describe('HOF Test Suite', () => {
    let agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
    })

    afterAll(async () => {
        await server.destroy()
    })

    test('Get HOF data', async () => {
        const response = await agent.get('/gameApi/getHofData/')
        expect(response.statusCode).toBe(200)
        expect(response.body.verlag).toContain('UserA')
        expect(response.body.spende).toContain('UserB')
        expect(response.body.translation).toContain('UserC')
        expect(response.body.family).toContain('UserD')
        expect(response.body.family).toContain('UserE')
    })
})
